import { describe, expect, it, vi } from "vitest";
import type { FetchMetricResult } from "../../integrations/metrics-api.js";
import type { ListedService } from "../servicos/servicos.repository.js";
import { ColetasService } from "./coletas.service.js";

vi.mock("../../config/env.js", () => ({
  env: {
    metricsApiUrl: "https://metrics.exemplo",
    externalApiTimeoutMs: 5000,
  },
}));

function makeService(id: number, status = "active"): ListedService {
  return {
    id_service: id,
    external_id: `external-${id}`,
    name: `Service ${id}`,
    status,
    last_seen_at: null,
    region_code: "BR-SP",
    country: "Brasil",
    region: "São Paulo",
    city: "São Paulo",
    latitude: -23.55,
    longitude: -46.63,
    last_collection_status: null,
    last_collection_at: null,
  };
}

function makeMetric(cpuPercent: number, recordedAt: string) {
  return {
    cpu_percent: cpuPercent,
    memory_gb: 4,
    disk_gb: 50,
    network_gb: 2,
    recorded_at: recordedAt,
  };
}

describe("ColetasService.collectAllMetrics", () => {
  it("consulta e persiste uma tentativa individual para cada serviço ativo", async () => {
    const services = [
      makeService(1),
      makeService(2),
      makeService(3, "removed"),
    ];
    const listAll = vi.fn().mockResolvedValue(services);
    const saveCollection = vi.fn().mockResolvedValue(undefined);
    const fetchMetrics = vi
      .fn<(serviceId: string) => Promise<FetchMetricResult>>()
      .mockResolvedValueOnce({
        status: "success",
        data: makeMetric(10, "2026-10-26T00:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        status: "error",
        failure_reason: "A API de métricas respondeu com HTTP 503.",
      });
    const coletasService = new ColetasService(
      { listAll },
      {
        saveCollection,
        findHistoryByService: vi.fn().mockResolvedValue([]),
      },
      fetchMetrics,
    );

    const summary = await coletasService.collectAllMetrics();

    expect(fetchMetrics).toHaveBeenCalledTimes(2);
    expect(fetchMetrics).toHaveBeenNthCalledWith(1, "external-1");
    expect(fetchMetrics).toHaveBeenNthCalledWith(2, "external-2");
    expect(saveCollection).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({
      skipped: false,
      totalServices: 2,
      successCount: 1,
      noMetricsCount: 0,
      unavailableCount: 0,
      errorCount: 1,
      failures: [
        {
          service: "Service 2",
          reason: "A API de métricas respondeu com HTTP 503.",
        },
      ],
    });
  });

  it("continua para os próximos serviços se uma gravação no banco falhar", async () => {
    const saveCollection = vi
      .fn()
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(undefined);
    const fetchMetrics = vi
      .fn<(serviceId: string) => Promise<FetchMetricResult>>()
      .mockResolvedValue({
        status: "no_metrics",
        http_status: 404,
      });
    const coletasService = new ColetasService(
      { listAll: vi.fn().mockResolvedValue([makeService(1), makeService(2)]) },
      {
        saveCollection,
        findHistoryByService: vi.fn().mockResolvedValue([]),
      },
      fetchMetrics,
    );

    const summary = await coletasService.collectAllMetrics();

    expect(fetchMetrics).toHaveBeenCalledTimes(2);
    expect(saveCollection).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({
      totalServices: 2,
      successCount: 0,
      noMetricsCount: 1,
      errorCount: 1,
      failures: [
        {
          service: "Service 1",
          reason: "Não foi possível salvar o resultado da coleta no banco.",
        },
      ],
    });
  });

  it("persiste coletas sucessivas com valores diferentes sem sobrescrever as anteriores", async () => {
    const saveCollection = vi.fn().mockResolvedValue(undefined);
    const fetchMetrics = vi
      .fn<(serviceId: string) => Promise<FetchMetricResult>>()
      .mockResolvedValueOnce({
        status: "success",
        data: makeMetric(12, "2026-10-26T10:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        status: "success",
        data: makeMetric(87, "2026-10-26T10:01:00.000Z"),
      });
    const coletasService = new ColetasService(
      { listAll: vi.fn().mockResolvedValue([makeService(1)]) },
      {
        saveCollection,
        findHistoryByService: vi.fn().mockResolvedValue([]),
      },
      fetchMetrics,
    );

    const first = await coletasService.collectAllMetrics();
    const second = await coletasService.collectAllMetrics();

    expect(fetchMetrics).toHaveBeenCalledTimes(2);
    expect(saveCollection).toHaveBeenCalledTimes(2);

    // Cada execução gera uma nova amostra, sem reaproveitar a anterior.
    expect(saveCollection.mock.calls[0][1]).toMatchObject({
      data: { cpu_percent: 12, recorded_at: "2026-10-26T10:00:00.000Z" },
    });
    expect(saveCollection.mock.calls[1][1]).toMatchObject({
      data: { cpu_percent: 87, recorded_at: "2026-10-26T10:01:00.000Z" },
    });
    expect(first).toMatchObject({
      skipped: false,
      totalServices: 1,
      successCount: 1,
      errorCount: 0,
    });
    expect(second).toMatchObject({
      skipped: false,
      totalServices: 1,
      successCount: 1,
      errorCount: 0,
    });
  });

  it("contabiliza sucesso, ausência de métricas, indisponibilidade e falha sem interromper o ciclo", async () => {
    const fetchMetrics = vi
      .fn<(serviceId: string) => Promise<FetchMetricResult>>()
      .mockResolvedValueOnce({
        status: "success",
        data: makeMetric(10, "2026-10-26T10:00:00.000Z"),
      })
      .mockResolvedValueOnce({ status: "no_metrics", http_status: 404 })
      .mockResolvedValueOnce({
        status: "unavailable",
        failure_reason: "A consulta à API de métricas excedeu o tempo limite.",
      })
      .mockResolvedValueOnce({
        status: "error",
        failure_reason: "A API de métricas respondeu com HTTP 500.",
      });
    const coletasService = new ColetasService(
      {
        listAll: vi
          .fn()
          .mockResolvedValue([
            makeService(1),
            makeService(2),
            makeService(3),
            makeService(4),
          ]),
      },
      {
        saveCollection: vi.fn().mockResolvedValue(undefined),
        findHistoryByService: vi.fn().mockResolvedValue([]),
      },
      fetchMetrics,
    );

    const summary = await coletasService.collectAllMetrics();

    expect(fetchMetrics).toHaveBeenCalledTimes(4);
    expect(summary).toEqual({
      skipped: false,
      totalServices: 4,
      successCount: 1,
      noMetricsCount: 1,
      unavailableCount: 1,
      errorCount: 1,
      failures: [
        {
          service: "Service 3",
          reason: "A consulta à API de métricas excedeu o tempo limite.",
        },
        {
          service: "Service 4",
          reason: "A API de métricas respondeu com HTTP 500.",
        },
      ],
    });
  });

  it("ignora novo ciclo enquanto uma coleta anterior está em andamento", async () => {
    let resolveServices: (services: ListedService[]) => void = () => {};
    const listAll = vi.fn(
      () =>
        new Promise<ListedService[]>((resolve) => {
          resolveServices = resolve;
        }),
    );
    const fetchMetrics =
      vi.fn<(serviceId: string) => Promise<FetchMetricResult>>();
    const coletasService = new ColetasService(
      { listAll },
      {
        saveCollection: vi.fn().mockResolvedValue(undefined),
        findHistoryByService: vi.fn().mockResolvedValue([]),
      },
      fetchMetrics,
    );

    const firstRun = coletasService.collectAllMetrics();

    const concurrent = await new ColetasService(
      { listAll },
      {
        saveCollection: vi.fn().mockResolvedValue(undefined),
        findHistoryByService: vi.fn().mockResolvedValue([]),
      },
      fetchMetrics,
    ).collectAllMetrics();

    expect(concurrent).toEqual({
      skipped: true,
      totalServices: 0,
      successCount: 0,
      noMetricsCount: 0,
      unavailableCount: 0,
      errorCount: 0,
      failures: [],
    });
    expect(listAll).toHaveBeenCalledTimes(1);
    expect(fetchMetrics).not.toHaveBeenCalled();

    resolveServices([]);
    expect(await firstRun).toMatchObject({ skipped: false, totalServices: 0 });

    // A guarda é liberada quando o ciclo termina.
    listAll.mockResolvedValue([]);
    const next = await coletasService.collectAllMetrics();

    expect(next.skipped).toBe(false);
  });
});
//cria uma instancia com dependencias simuladas para testar o método getHistoryByService
describe("ColetasService.getHistoryByService", () => {
  function setup() {
    const listAll = vi.fn().mockResolvedValue([]);
    const saveCollection = vi.fn().mockResolvedValue(undefined);
    const findHistoryByService = vi.fn().mockResolvedValue([]);
    const fetchMetrics =
      vi.fn<(serviceId: string) => Promise<FetchMetricResult>>();

    const service = new ColetasService(
      { listAll },
      { saveCollection, findHistoryByService },
      fetchMetrics,
    );

    return {
      service,
      listAll,
      saveCollection,
      findHistoryByService,
      fetchMetrics,
    };
  }

  it("converte o ID para número e retorna o histórico do repository", async () => {
    const {
      service,
      findHistoryByService,
      listAll,
      saveCollection,
      fetchMetrics,
    } = setup();

    const history = [
      {
        id_collection: "42",
        service_id: 7,
        status: "success",
        attempted_at: "2026-10-29T10:00:00.000Z",
      },
    ];

    findHistoryByService.mockResolvedValue(history);

    const result = await service.getHistoryByService("7");

    expect(findHistoryByService).toHaveBeenCalledExactlyOnceWith(7);
    expect(result).toEqual(history);

    // Consultar histórico não deve iniciar uma coleta.
    expect(listAll).not.toHaveBeenCalled();
    expect(saveCollection).not.toHaveBeenCalled();
    expect(fetchMetrics).not.toHaveBeenCalled();
  });

  it("retorna lista vazia quando o repository não encontra coletas", async () => {
    const { service, findHistoryByService } = setup();

    await expect(service.getHistoryByService("7")).resolves.toEqual([]);

    expect(findHistoryByService).toHaveBeenCalledExactlyOnceWith(7);
  });

  it.each([
    "",
    "abc",
    "0",
    "-1",
    "1.5",
    "1abc",
    " 7 ",
    "2147483648",
    "9007199254740992",
  ])("rejeita o ID inválido %j sem consultar o repository", async (id) => {
    const { service, findHistoryByService } = setup();

    await expect(service.getHistoryByService(id)).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_SERVICE_ID",
    });

    expect(findHistoryByService).not.toHaveBeenCalled();
  });

  it("aceita o maior ID permitido pelo tipo INTEGER do banco", async () => {
    const { service, findHistoryByService } = setup();

    await expect(service.getHistoryByService("2147483647")).resolves.toEqual(
      [],
    );

    expect(findHistoryByService).toHaveBeenCalledExactlyOnceWith(2147483647);
  });

  it("propaga o erro quando o repository falha", async () => {
    const { service, findHistoryByService } = setup();
    const error = new Error("Falha ao consultar o banco");

    findHistoryByService.mockRejectedValue(error);

    await expect(service.getHistoryByService("7")).rejects.toBe(error);

    expect(findHistoryByService).toHaveBeenCalledExactlyOnceWith(7);
  });
});

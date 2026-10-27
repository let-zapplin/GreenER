import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetricaService } from "./coletas.service.js";
import type { NormalizedMetric } from "../../integrations/metrics-api.js";

const { fetchServiceMetricsMock, saveCollectionMock, listAllMock } = vi.hoisted(
  () => ({
    fetchServiceMetricsMock: vi.fn(),
    saveCollectionMock: vi.fn(),
    listAllMock: vi.fn(),
  }),
);

vi.mock("../../integrations/metrics-api.js", () => ({
  fetchServiceMetrics: fetchServiceMetricsMock,
}));

vi.mock("./coletas.repository.js", () => ({
  MetricaRepository: class {
    saveCollection = saveCollectionMock;
  },
}));

vi.mock("../servicos/servicos.service.js", () => ({
  ServicosService: class {
    listAll = listAllMock;
  },
}));

const servico = { id_service: 1, external_id: "svc-1", name: "API de pedidos" };

function metric(cpuPercent: number, recordedAt: string): NormalizedMetric {
  return {
    cpu_percent: cpuPercent,
    memory_gb: 4,
    disk_gb: 100,
    network_gb: 2,
    recorded_at: recordedAt,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("MetricaService.collectAllMetrics", () => {
  it("persiste coletas sucessivas com valores diferentes sem sobrescrever as anteriores", async () => {
    listAllMock.mockResolvedValue([servico]);
    fetchServiceMetricsMock
      .mockResolvedValueOnce({
        status: "success",
        data: metric(12, "2026-10-26T10:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        status: "success",
        data: metric(87, "2026-10-26T10:01:00.000Z"),
      });

    const service = new MetricaService();

    const first = await service.collectAllMetrics();
    const second = await service.collectAllMetrics();

    expect(fetchServiceMetricsMock).toHaveBeenCalledTimes(2);
    expect(saveCollectionMock).toHaveBeenCalledTimes(2);

    // Cada execução gera uma nova amostra, sem reaproveitar a anterior.
    expect(saveCollectionMock.mock.calls[0][1]).toMatchObject({
      data: { cpu_percent: 12, recorded_at: "2026-10-26T10:00:00.000Z" },
    });
    expect(saveCollectionMock.mock.calls[1][1]).toMatchObject({
      data: { cpu_percent: 87, recorded_at: "2026-10-26T10:01:00.000Z" },
    });
    expect(first).toEqual({
      skipped: false,
      services: 1,
      success: 1,
      noMetrics: 0,
      errors: 0,
    });
    expect(second).toEqual({
      skipped: false,
      services: 1,
      success: 1,
      noMetrics: 0,
      errors: 0,
    });
  });

  it("contabiliza sucesso, ausência de métricas e falha sem interromper o ciclo", async () => {
    listAllMock.mockResolvedValue([
      { id_service: 1, external_id: "svc-1", name: "A" },
      { id_service: 2, external_id: "svc-2", name: "B" },
      { id_service: 3, external_id: "svc-3", name: "C" },
    ]);
    fetchServiceMetricsMock
      .mockResolvedValueOnce({
        status: "success",
        data: metric(10, "2026-10-26T10:00:00.000Z"),
      })
      .mockResolvedValueOnce({ status: "no_metrics", http_status: 404 })
      .mockResolvedValueOnce({
        status: "error",
        failure_reason: "Timeout na requisição",
      });

    const summary = await new MetricaService().collectAllMetrics();

    expect(saveCollectionMock).toHaveBeenCalledTimes(3);
    expect(summary).toEqual({
      skipped: false,
      services: 3,
      success: 1,
      noMetrics: 1,
      errors: 1,
    });
  });

  it("continua a coleta quando a persistência de um serviço falha", async () => {
    listAllMock.mockResolvedValue([
      { id_service: 1, external_id: "svc-1", name: "A" },
      { id_service: 2, external_id: "svc-2", name: "B" },
    ]);
    fetchServiceMetricsMock
      .mockResolvedValueOnce({
        status: "success",
        data: metric(10, "2026-10-26T10:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        status: "success",
        data: metric(20, "2026-10-26T10:00:00.000Z"),
      });
    saveCollectionMock
      .mockRejectedValueOnce(new Error("falha no banco"))
      .mockResolvedValueOnce(undefined);

    const summary = await new MetricaService().collectAllMetrics();

    expect(fetchServiceMetricsMock).toHaveBeenCalledTimes(2);
    expect(saveCollectionMock).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({
      skipped: false,
      services: 2,
      success: 1,
      noMetrics: 0,
      errors: 1,
    });
  });

  it("ignora novo ciclo enquanto uma coleta anterior está em andamento", async () => {
    let resolveServices: (services: unknown[]) => void = () => {};
    listAllMock.mockImplementation(
      () =>
        new Promise<unknown[]>((resolve) => {
          resolveServices = resolve;
        }),
    );

    const service = new MetricaService();
    const firstRun = service.collectAllMetrics();

    const concurrent = await new MetricaService().collectAllMetrics();

    expect(concurrent).toEqual({
      skipped: true,
      services: 0,
      success: 0,
      noMetrics: 0,
      errors: 0,
    });
    expect(listAllMock).toHaveBeenCalledTimes(1);
    expect(fetchServiceMetricsMock).not.toHaveBeenCalled();

    resolveServices([]);
    expect(await firstRun).toMatchObject({ skipped: false, services: 0 });

    // A guarda é liberada quando o ciclo termina.
    listAllMock.mockResolvedValue([]);
    const next = await service.collectAllMetrics();

    expect(next.skipped).toBe(false);
  });
});

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

function makeService(
  id: number,
  status = "active",
): ListedService {
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
  };
}

describe("ColetasService.collectAllMetrics", () => {
  it("consulta e persiste uma tentativa individual para cada serviço ativo", async () => {
    const services = [makeService(1), makeService(2), makeService(3, "removed")];
    const listAll = vi.fn().mockResolvedValue(services);
    const saveCollection = vi.fn().mockResolvedValue(undefined);
    const fetchMetrics = vi.fn<(
      serviceId: string,
    ) => Promise<FetchMetricResult>>()
      .mockResolvedValueOnce({
        status: "success",
        data: {
          cpu_percent: 10,
          memory_gb: 4,
          disk_gb: 50,
          network_gb: 2,
          recorded_at: "2026-10-26T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        status: "error",
        failure_reason: "A consulta à API de métricas excedeu o tempo limite.",
      });
    const coletasService = new ColetasService(
      { listAll },
      { saveCollection },
      fetchMetrics,
    );

    const summary = await coletasService.collectAllMetrics();

    expect(fetchMetrics).toHaveBeenCalledTimes(2);
    expect(fetchMetrics).toHaveBeenNthCalledWith(1, "external-1");
    expect(fetchMetrics).toHaveBeenNthCalledWith(2, "external-2");
    expect(saveCollection).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({
      totalServices: 2,
      successCount: 1,
      noMetricsCount: 0,
      errorCount: 1,
      failures: [
        {
          service: "Service 2",
          reason: "A consulta à API de métricas excedeu o tempo limite.",
        },
      ],
    });
  });

  it("continua para os próximos serviços se uma gravação no banco falhar", async () => {
    const saveCollection = vi
      .fn()
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(undefined);
    const fetchMetrics = vi.fn<(
      serviceId: string,
    ) => Promise<FetchMetricResult>>().mockResolvedValue({
      status: "no_metrics",
      http_status: 404,
    });
    const coletasService = new ColetasService(
      { listAll: vi.fn().mockResolvedValue([makeService(1), makeService(2)]) },
      { saveCollection },
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
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndicadoresService } from "./indicadores.service.js";
import type {
  IndicatorCollection,
  ServiceIndicatorData,
} from "./indicadores.repository.js";

vi.mock("../../config/env.js", () => ({
  env: {
    metricsCollectionIntervalMs: 60_000,
    carbonIntensityMaxAgeMs: 300_000,
  },
}));

vi.mock("./indicadores.repository.js", () => ({
  IndicadoresRepository: class {},
}));

function createCollection(
  overrides: Partial<IndicatorCollection> = {},
): IndicatorCollection {
  return {
    id_collection: "101",
    status: "success",
    attempted_at: new Date("2026-10-30T12:00:00.000Z"),
    id_metrics: "201",
    recorded_at: new Date("2026-10-30T12:00:00.000Z"),
    cpu_percent: 50,
    memory_gb: 2,
    disk_gb: 10,
    network_gb: 5,
    carbon_intensity_id: 301,
    carbon_intensity_gco2e_per_kwh: 200,
    ...overrides,
  };
}

function createServiceData(
  collections: IndicatorCollection[],
): ServiceIndicatorData {
  return {
    id_service: 7,
    name: "Serviço de pedidos",
    status: "active",
    region_code: "BR-SP",
    collections,
  };
}

describe("IndicadoresService.getIndicators", () => {
  const findCollectionsForPeriod = vi.fn();
  const service = new IndicadoresService(
    { findCollectionsForPeriod },
    60_000,
    300_000,
  );
  const start = "2026-10-30T00:00:00.000Z";
  const end = "2026-10-31T00:00:00.000Z";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcula energia e emissão com as métricas e intensidade regionais", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([createCollection()]),
    ]);

    const result = await service.getIndicators(start, end);
    const calculatedSample = result.services[0].latestSampleInPeriod;

    expect(calculatedSample?.energyKwh).toBeCloseTo(
      (50.95 * 60_000) / 3_600_000_000,
    );
    expect(calculatedSample?.emissionsGco2e).toBeCloseTo(
      ((50.95 * 60_000) / 3_600_000_000) * 200,
    );
    expect(result.summary.isPartial).toBe(false);
    expect(findCollectionsForPeriod).toHaveBeenCalledWith(
      new Date(start),
      new Date(end),
      300_000,
    );
  });

  it("retorna energia e sinaliza a falta de intensidade sem inventar emissão", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([
        createCollection({
          carbon_intensity_id: null,
          carbon_intensity_gco2e_per_kwh: null,
        }),
      ]),
    ]);

    const result = await service.getIndicators(start, end);
    const sample = result.services[0].latestSampleInPeriod;

    expect(sample?.energyKwh).toBeGreaterThan(0);
    expect(sample?.emissionsGco2e).toBeNull();
    expect(sample?.gapReason).toBe("carbon_intensity_unavailable");
    expect(result.summary.isPartial).toBe(true);
    expect(result.summary.carbonIntensityCoveragePercent).toBe(0);
  });

  it("registra coletas sem métricas como lacunas, sem calcular energia", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([
        createCollection({
          status: "unavailable",
          id_metrics: null,
          cpu_percent: null,
          memory_gb: null,
          disk_gb: null,
          network_gb: null,
          carbon_intensity_id: null,
          carbon_intensity_gco2e_per_kwh: null,
        }),
      ]),
    ]);

    const result = await service.getIndicators(start, end);
    const totals = result.services[0].periodTotals;

    expect(totals.energyKwh).toBe(0);
    expect(totals.emissionsGco2e).toBe(0);
    expect(totals.isPartial).toBe(true);
    expect(totals.gaps).toEqual([
      expect.objectContaining({
        collectionId: "101",
        reason: "unavailable",
      }),
    ]);
  });

  it("rejeita períodos inválidos antes de consultar o repository", async () => {
    await expect(service.getIndicators(end, start)).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_INDICATOR_PERIOD",
    });
    await expect(
      service.getIndicators("data-inválida", end),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_INDICATOR_PERIOD",
    });
    expect(findCollectionsForPeriod).not.toHaveBeenCalled();
  });
});

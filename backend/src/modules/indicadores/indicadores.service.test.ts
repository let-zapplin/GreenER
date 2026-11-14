import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndicadoresService } from "./indicadores.service.js";
import type {
  IndicatorCollection,
  ServiceIndicatorData,
} from "./indicadores.repository.js";

// Testa os cálculos reais com dados do repository simulados e configuração fixa.
// Esta suíte não comprova a seleção de região ou período pelo SQL real.
vi.mock("../../config/env.js", () => ({
  env: {
    metricsCollectionIntervalMs: 60_000,
    carbonIntensityMaxAgeMs: 300_000,
  },
}));

vi.mock("./indicadores.repository.js", () => ({
  IndicadoresRepository: class {},
}));

// Cria uma amostra completa; overrides permite alterar somente os campos de cada cenário.
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
    collection_interval_seconds: 45,
    carbon_intensity_id: 301,
    carbon_intensity_gco2e_per_kwh: 200,
    ...overrides,
  };
}

// Agrupa as amostras simuladas sob a identificação de um serviço.
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
  const service = new IndicadoresService({ findCollectionsForPeriod }, 300_000);
  const start = "2026-10-30T00:00:00.000Z";
  const end = "2026-10-31T00:00:00.000Z";

  beforeEach(() => {
    // Limpa as chamadas para conferir se o repository foi consultado com os argumentos esperados.
    vi.clearAllMocks();
  });

  // Os recursos somam 50,95 W. A energia usa 45 segundos por amostra;
  // 60000 ms continua sendo o intervalo do job, não a duração usada no cálculo.
  it("calcula energia e emissão com as métricas e intensidade regionais", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([createCollection()]),
    ]);

    const result = await service.getIndicators(start, end);
    const calculatedSample = result.services[0].latestSampleInPeriod;

    expect(calculatedSample?.metrics).toEqual({
      cpuPercent: 50,
      memoryGb: 2,
      diskGb: 10,
      networkGb: 5,
    });

    expect(calculatedSample?.collectionIntervalSeconds).toBe(45);
    expect(calculatedSample?.energyKwh).toBeCloseTo((50.95 * 45) / 3_600_000);
    expect(calculatedSample?.emissionsGco2e).toBeCloseTo(
      ((50.95 * 45) / 3_600_000) * 200,
    );
    expect(result.period.collectionIntervalMs).toBe(60_000);
    expect(result.summary.isPartial).toBe(false);
    expect(findCollectionsForPeriod).toHaveBeenCalledWith(
      new Date(start),
      new Date(end),
      300_000,
    );
  });

  it("consolida recursos e decompõe energia usando a duração de cada amostra", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([
        createCollection({
          cpu_percent: 20,
          memory_gb: 1,
          disk_gb: 10,
          network_gb: 1.2,
          collection_interval_seconds: 10,
          renewable_share_percent: 60,
        }),
        createCollection({
          id_collection: "102",
          cpu_percent: 80,
          memory_gb: 3,
          disk_gb: 30,
          network_gb: 2.8,
          collection_interval_seconds: 30,
          renewable_share_percent: 65,
        }),
      ]),
    ]);

    const result = await service.getIndicators(start, end);
    const indicator = result.services[0];

    expect(indicator.resourceSummary).toEqual({
      cpu: { averagePercent: 65, peakPercent: 80 },
      memory: { averageGb: 2, peakGb: 3 },
      disk: { averageGb: 20, peakGb: 30 },
      network: { totalGb: 4 },
    });
    expect(indicator.energyBreakdown.cpuKwh).toBeCloseTo(
      2600 / 3_600_000,
    );
    expect(indicator.energyBreakdown.memoryKwh).toBeCloseTo(
      37.5 / 3_600_000,
    );
    expect(indicator.energyBreakdown.diskKwh).toBeCloseTo(
      10 / 3_600_000,
    );
    expect(indicator.energyBreakdown.networkKwh).toBeCloseTo(
      1.92 / 3_600_000,
    );
    expect(
      Object.values(indicator.energyBreakdown).reduce(
        (total, component) => total + component,
        0,
      ),
    ).toBeCloseTo(indicator.periodTotals.energyKwh);
    expect(indicator.regionalContext).toEqual({
      regionCode: "BR-SP",
      carbonIntensityGco2ePerKwh: 200,
      renewableSharePercent: 65,
    });
  });

  // Métricas existem, mas duração nula impede calcular energia e emissão; não há fallback para o job.
  it("registra amostras sem intervalo válido como lacunas", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([
        createCollection({
          collection_interval_seconds: null,
        }),
      ]),
    ]);

    const result = await service.getIndicators(start, end);
    const sample = result.services[0].latestSampleInPeriod;
    const totals = result.services[0].periodTotals;

    expect(sample?.metrics).toEqual({
      cpuPercent: 50,
      memoryGb: 2,
      diskGb: 10,
      networkGb: 5,
    });


    expect(sample?.collectionIntervalSeconds).toBeNull();
    expect(sample?.energyKwh).toBeNull();
    expect(sample?.emissionsGco2e).toBeNull();
    expect(sample?.gapReason).toBe("collection_interval_unavailable");
    expect(result.services[0].resourceSummary).toEqual({
      cpu: { averagePercent: null, peakPercent: 50 },
      memory: { averageGb: 2, peakGb: 2 },
      disk: { averageGb: 10, peakGb: 10 },
      network: { totalGb: 5 },
    });
    expect(result.services[0].energyBreakdown).toEqual({
      cpuKwh: null,
      memoryKwh: null,
      diskKwh: null,
      networkKwh: null,
    });
    expect(result.services[0].regionalContext).toEqual({
      regionCode: "BR-SP",
      carbonIntensityGco2ePerKwh: 200,
      renewableSharePercent: null,
    });
    expect(totals.validMetricCount).toBe(0);
    expect(totals.energyKwh).toBe(0);
    expect(totals.isPartial).toBe(true);
    expect(totals.gaps).toEqual([
      expect.objectContaining({
        collectionId: "101",
        reason: "collection_interval_unavailable",
      }),
    ]);
  });

  // Sem fator de carbono utilizável, preserva energia e marca emissão como indisponível.
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

  // A tentativa unavailable mantém a lacuna; os totais zerados não representam uma amostra de consumo zero.
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
    const sample = result.services[0].latestSampleInPeriod;
    const totals = result.services[0].periodTotals;
    expect(sample?.metrics).toBeNull();

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

  // Período invertido e data inválida devem falhar antes de consultar dados.
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

// Testa o cálculo das amostras históricas com dados controlados, sem acessar PostgreSQL.
describe("IndicadoresService.getServiceHistory", () => {
  const findCollectionsForPeriod = vi.fn();

  const service = new IndicadoresService(
    { findCollectionsForPeriod },
    300_000,
  );

  const serviceId = 7;
  const start = "2026-10-30T00:00:00.000Z";
  const end = "2026-10-31T00:00:00.000Z";

  beforeEach(() => {
    // Limpa as chamadas para conferir se o repository foi consultado com os argumentos esperados.
    vi.clearAllMocks();
  });

  // O cálculo é real, mas as duas coletas são simuladas; confere também o filtro serviceId encaminhado.
  it("retorna o histórico ambiental real do serviço no período", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([
        createCollection({
          id_collection: "101",
          attempted_at: new Date("2026-10-30T12:00:00.000Z"),
        }),
        createCollection({
          id_collection: "102",
          attempted_at: new Date("2026-10-30T12:01:00.000Z"),
          cpu_percent: 60,
        }),
      ]),
    ]);

    const result = await service.getServiceHistory(
      serviceId,
      start,
      end,
    );

    expect(result.service).toEqual({
      serviceId: 7,
      name: "Serviço de pedidos",
      status: "active",
      regionCode: "BR-SP",
    });

    expect(result.samples).toHaveLength(2);

    expect(result.samples[0].collectionId).toBe("101");
    expect(result.samples[0].attemptedAt).toEqual(
      new Date("2026-10-30T12:00:00.000Z"),
    );
    expect(result.samples[0].energyKwh).toBeGreaterThan(0);

    expect(result.samples[1].collectionId).toBe("102");
    expect(result.samples[1].attemptedAt).toEqual(
      new Date("2026-10-30T12:01:00.000Z"),
    );
    expect(result.samples[1].energyKwh).toBeGreaterThan(0);

    expect(findCollectionsForPeriod).toHaveBeenCalledWith(
      new Date(start),
      new Date(end),
      300_000,
      serviceId,
    );
  });

  // O serviço existe na resposta do repository, porém sua lista de coletas está vazia.
  it("retorna lista vazia quando o serviço existe, mas não possui coletas no período", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([]),
    ]);

    const result = await service.getServiceHistory(
      serviceId,
      start,
      end,
    );

    expect(result.service.serviceId).toBe(serviceId);
    expect(result.samples).toEqual([]);
  });

  // Valores ausentes continuam null, acompanhados do motivo unavailable.
  it("preserva lacunas do histórico sem transformar ausência de dado em zero", async () => {
    findCollectionsForPeriod.mockResolvedValue([
      createServiceData([
        createCollection({
          status: "unavailable",
          id_metrics: null,
          cpu_percent: null,
          memory_gb: null,
          disk_gb: null,
          network_gb: null,
          collection_interval_seconds: null,
          carbon_intensity_id: null,
          carbon_intensity_gco2e_per_kwh: null,
        }),
      ]),
    ]);

    const result = await service.getServiceHistory(
      serviceId,
      start,
      end,
    );

    expect(result.samples).toHaveLength(1);

    expect(result.samples[0].energyKwh).toBeNull();
    expect(result.samples[0].emissionsGco2e).toBeNull();
    expect(result.samples[0].gapReason).toBe("unavailable");
  });

  // Uma lista de serviços vazia representa ausência do serviço, diferente de um serviço sem coletas.
  it("retorna erro 404 quando o serviço não existe", async () => {
    findCollectionsForPeriod.mockResolvedValue([]);

    await expect(
      service.getServiceHistory(serviceId, start, end),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "SERVICE_NOT_FOUND",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * O teste valida apenas as regras do ProjecoesService.
 *
 * IndicadoresService e ProjecoesRepository são substituídos
 * porque suas implementações reais carregam configuração
 * de ambiente e conexão com o banco.
 */
vi.mock("../indicadores/indicadores.service.js", () => ({
  IndicadoresService: class {},
}));

vi.mock("../../config/env.js", () => ({
  env: {
    carbonIntensityMaxAgeMs: 300_000,
  },
}));

vi.mock("./projecoes.repository.js", () => ({
  ProjecoesRepository: class {},
}));

import { ProjecoesService } from "./projecoes.service.js";

describe("ProjecoesService.projectLocation", () => {
  const getServiceHistory = vi.fn();
  const getIndicators = vi.fn();
  const findLatestRegionalSnapshots = vi.fn();
  const listAvailableRegions = vi.fn();

  const service = new ProjecoesService(
    {
      getServiceHistory,
      getIndicators,
    },
    {
      findLatestRegionalSnapshots,
      listAvailableRegions,
    },
    300_000,
  );

  const start = "2026-11-16T00:00:00.000Z";
  const end = "2026-11-17T00:00:00.000Z";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("projeta as emissões mantendo a mesma energia entre regiões", async () => {
    getServiceHistory.mockResolvedValue({
      period: {
        start: new Date(start),
        end: new Date(end),
        collectionIntervalMs: 60_000,
        displayIntervalMs: 60_000,
      },

      service: {
        serviceId: 7,
        name: "Billing API",
        status: "active",
        regionCode: "BR-SP",
      },

      samples: [
        {
          collectionId: "101",
          attemptedAt: new Date("2026-11-16T10:00:00.000Z"),
          status: "success",
          metrics: null,
          collectionIntervalSeconds: 60,
          energyKwh: 0.4,
          emissionsGco2e: 40,
          carbonIntensityGco2ePerKwh: 100,
          gapReason: null,
        },

        {
          collectionId: "102",
          attemptedAt: new Date("2026-11-16T10:01:00.000Z"),
          status: "success",
          metrics: null,
          collectionIntervalSeconds: 60,
          energyKwh: 0.6,
          emissionsGco2e: 60,
          carbonIntensityGco2ePerKwh: 100,
          gapReason: null,
        },
      ],
    });

    findLatestRegionalSnapshots.mockResolvedValue([
      {
        regionCode: "BR-SP",
        country: "Brasil",
        region: "São Paulo",
        city: null,
        latitude: -23.55,
        longitude: -46.63,
        carbonIntensityGco2ePerKwh: 100,
        renewableSharePercent: 80,
        registeredAt: new Date(
          "2026-11-17T00:00:00.000Z",
        ),
      },

      {
        regionCode: "CA-QC",
        country: "Canadá",
        region: "Quebec",
        city: null,
        latitude: 46.81,
        longitude: -71.21,
        carbonIntensityGco2ePerKwh: 25,
        renewableSharePercent: 95,
        registeredAt: new Date(
          "2026-11-17T00:00:00.000Z",
        ),
      },
    ]);

    const result = await service.projectLocation(
      7,
      start,
      end,
      ["CA-QC"],
    );

    expect(result.energyKwh).toBeCloseTo(1);

    expect(result.scenarios).toHaveLength(2);

    const currentScenario = result.scenarios.find(
      (scenario) => scenario.regionCode === "BR-SP",
    );

    const projectedScenario = result.scenarios.find(
      (scenario) => scenario.regionCode === "CA-QC",
    );

    expect(currentScenario).toMatchObject({
      regionCode: "BR-SP",
      isCurrent: true,
      projectedEmissionsGco2e: 100,
      differenceGco2e: 0,
      differencePercent: 0,
    });

    expect(projectedScenario).toMatchObject({
      regionCode: "CA-QC",
      isCurrent: false,
      projectedEmissionsGco2e: 25,
      differenceGco2e: -75,
      differencePercent: -75,
    });

    expect(findLatestRegionalSnapshots).toHaveBeenCalledWith([
      "BR-SP",
      "CA-QC",
    ]);
  });

  it("preserva ausência de energia como null", async () => {
    getServiceHistory.mockResolvedValue({
      period: {
        start: new Date(start),
        end: new Date(end),
        collectionIntervalMs: 60_000,
        displayIntervalMs: 60_000,
      },

      service: {
        serviceId: 7,
        name: "Billing API",
        status: "active",
        regionCode: "BR-SP",
      },

      samples: [
        {
          collectionId: "101",
          attemptedAt: new Date(),
          status: "unavailable",
          metrics: null,
          collectionIntervalSeconds: null,
          energyKwh: null,
          emissionsGco2e: null,
          carbonIntensityGco2ePerKwh: null,
          gapReason: "unavailable",
        },
      ],
    });

    findLatestRegionalSnapshots.mockResolvedValue([
      {
        regionCode: "BR-SP",
        country: "Brasil",
        region: "São Paulo",
        city: null,
        latitude: -23.55,
        longitude: -46.63,
        carbonIntensityGco2ePerKwh: 100,
        renewableSharePercent: 80,
        registeredAt: new Date(),
      },

      {
        regionCode: "CA-QC",
        country: "Canadá",
        region: "Quebec",
        city: null,
        latitude: 46.81,
        longitude: -71.21,
        carbonIntensityGco2ePerKwh: 25,
        renewableSharePercent: 95,
        registeredAt: new Date(),
      },
    ]);

    const result = await service.projectLocation(
      7,
      start,
      end,
      ["CA-QC"],
    );

    expect(result.energyKwh).toBeNull();

    expect(
      result.scenarios.every(
        (scenario) =>
          scenario.projectedEmissionsGco2e === null,
      ),
    ).toBe(true);

    expect(result.isPartial).toBe(true);
  });

  it("informa regiões sem snapshot disponível", async () => {
    getServiceHistory.mockResolvedValue({
      period: {
        start: new Date(start),
        end: new Date(end),
        collectionIntervalMs: 60_000,
        displayIntervalMs: 60_000,
      },

      service: {
        serviceId: 7,
        name: "Billing API",
        status: "active",
        regionCode: "BR-SP",
      },

      samples: [
        {
          collectionId: "101",
          attemptedAt: new Date(),
          status: "success",
          metrics: null,
          collectionIntervalSeconds: 60,
          energyKwh: 1,
          emissionsGco2e: 100,
          carbonIntensityGco2ePerKwh: 100,
          gapReason: null,
        },
      ],
    });

    findLatestRegionalSnapshots.mockResolvedValue([
      {
        regionCode: "BR-SP",
        country: "Brasil",
        region: "São Paulo",
        city: null,
        latitude: -23.55,
        longitude: -46.63,
        carbonIntensityGco2ePerKwh: 100,
        renewableSharePercent: 80,
        registeredAt: new Date(),
      },
    ]);

    const result = await service.projectLocation(
      7,
      start,
      end,
      ["REGIAO-INEXISTENTE"],
    );

    expect(result.unavailableRegionCodes).toEqual([
      "REGIAO-INEXISTENTE",
    ]);

    expect(result.scenarios).toHaveLength(1);
  });

  it("rejeita uma lista vazia de regiões", async () => {
    await expect(
      service.projectLocation(
        7,
        start,
        end,
        [],
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_PROJECTION_REGIONS",
    });

    expect(getServiceHistory).not.toHaveBeenCalled();

    expect(
      findLatestRegionalSnapshots,
    ).not.toHaveBeenCalled();
  });

});

describe("ProjecoesService.redistributeServices", () => {
  const getServiceHistory = vi.fn();
  const getIndicators = vi.fn();
  const findLatestRegionalSnapshots = vi.fn();
  const listAvailableRegions = vi.fn();
  const service = new ProjecoesService(
    {
      getServiceHistory,
      getIndicators,
    },
    {
      findLatestRegionalSnapshots,
      listAvailableRegions,
    },
    300_000,
  );
  const start = "2026-11-16T00:00:00.000Z";
  const end = "2026-11-17T00:00:00.000Z";

  function createRegion(
    regionCode: string,
    carbonIntensityGco2ePerKwh: number,
    registeredAt = new Date(),
  ) {
    return {
      regionCode,
      country: "País",
      region: regionCode,
      city: null,
      latitude: null,
      longitude: null,
      carbonIntensityGco2ePerKwh,
      renewableSharePercent: 50,
      registeredAt,
    };
  }

  function createServiceIndicator({
    serviceId,
    status = "active",
    regionCode,
    energyKwh,
    energyKwhWithCarbonIntensity = energyKwh,
    validMetricCount,
    observedEmissionsGco2e = energyKwh * 10,
    validObservedEmissionSampleCount = validMetricCount,
    collectionCount,
  }: {
    serviceId: number;
    status?: string;
    regionCode: string;
    energyKwh: number;
    energyKwhWithCarbonIntensity?: number;
    validMetricCount: number;
    observedEmissionsGco2e?: number;
    validObservedEmissionSampleCount?: number;
    collectionCount: number;
  }) {
    return {
      serviceId,
      name: `Serviço ${serviceId}`,
      status,
      regionCode,
      periodTotals: {
        energyKwh,
        energyKwhWithCarbonIntensity,
        emissionsGco2e: observedEmissionsGco2e,
        validMetricCount,
        validCarbonIntensityCount: validObservedEmissionSampleCount,
        collectionCount,
      },
    };
  }

  function mockRedistributionData(
    services: ReturnType<typeof createServiceIndicator>[],
    regions: ReturnType<typeof createRegion>[],
  ) {
    getIndicators.mockResolvedValue({
      period: {
        start: new Date(start),
        end: new Date(end),
      },
      services,
    });
    listAvailableRegions.mockResolvedValue(regions);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("minimiza emissões, preserva serviços sem energia e identifica resultados parciais", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 10,
          validMetricCount: 2,
          collectionCount: 4,
        }),
        createServiceIndicator({
          serviceId: 8,
          regionCode: "BR-SP",
          energyKwh: 5,
          validMetricCount: 5,
          collectionCount: 5,
        }),
        createServiceIndicator({
          serviceId: 9,
          regionCode: "BR-SP",
          energyKwh: 0,
          validMetricCount: 0,
          collectionCount: 3,
        }),
        createServiceIndicator({
          serviceId: 10,
          status: "removed",
          regionCode: "BR-SP",
          energyKwh: 1000,
          validMetricCount: 10,
          collectionCount: 10,
        }),
      ],
      [
        createRegion("BR-SP", 100),
        createRegion("CA-QC", 20),
        createRegion("DE-BE", 80),
        createRegion("AU-SYD", 5, new Date(Date.now() - 301_000)),
      ],
    );

    const result = await service.redistributeServices(start, end, true);

    expect(result.allocations).toMatchObject([
      {
        serviceId: 7,
        assignedRegionCode: "CA-QC",
        energyKwh: 10,
        validEnergySampleCount: 2,
        observedEmissionsGco2e: 100,
        validObservedEmissionSampleCount: 2,
        totalSampleCount: 4,
        isPartial: true,
        projectedEmissionsGco2e: 200,
      },
      {
        serviceId: 8,
        assignedRegionCode: "DE-BE",
        observedEmissionsGco2e: 50,
        validObservedEmissionSampleCount: 5,
        projectedEmissionsGco2e: 400,
      },
      {
        serviceId: 9,
        assignedRegionCode: "BR-SP",
        energyKwh: null,
        observedEmissionsGco2e: null,
        validObservedEmissionSampleCount: 0,
        projectedEmissionsGco2e: null,
        isPartial: true,
      },
    ]);
    expect(result.allocations.map(({ serviceId }) => serviceId)).toEqual([
      7, 8, 9,
    ]);
    expect(result.regions.map(({ serviceCount }) => serviceCount)).toEqual([
      1, 1, 1,
    ]);
    expect(result.knownProjectedEmissionsGco2e).toBe(600);
    expect(result.isPartial).toBe(true);
    expect(result.unavailableRegionCodes).toEqual(["AU-SYD"]);
    expect(getIndicators).toHaveBeenCalledWith(start, end);
  });

  it("não trata a ausência de intensidade válida como emissão observada zero", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 10,
          validMetricCount: 2,
          observedEmissionsGco2e: 0,
          validObservedEmissionSampleCount: 0,
          collectionCount: 2,
        }),
      ],
      [createRegion("BR-SP", 100)],
    );

    const result = await service.redistributeServices(
      start,
      end,
      "unconstrained",
    );

    expect(result.allocations[0]).toMatchObject({
      observedEmissionsGco2e: null,
      validObservedEmissionSampleCount: 0,
      projectedEmissionsGco2e: 1000,
    });
  });

  it(
  "projeta uma emissão comparável usando somente a energia com cobertura de carbono",
  async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,

          regionCode: "BR-SP",

          energyKwh: 10,

          energyKwhWithCarbonIntensity: 8,

          validMetricCount: 2,

          validObservedEmissionSampleCount: 1,

          observedEmissionsGco2e: 800,

          collectionCount: 2,
        }),
      ],

      [
        createRegion("BR-SP", 100),
        createRegion("CA-QC", 20),
      ],
    );

    const result =
      await service.redistributeServices(
        start,
        end,
        "unconstrained",
      );

    expect(result.allocations[0]).toMatchObject({
      energyKwh: 10,

      validEnergySampleCount: 2,

      validObservedEmissionSampleCount: 1,

      observedEmissionsGco2e: 800,

      projectedEmissionsGco2e: 200,

      comparableProjectedEmissionsGco2e: 160,
    });
  },
);

  it("marca o resultado parcial quando a cobertura de emissão observada é menor", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 10,
          validMetricCount: 2,
          observedEmissionsGco2e: 500,
          validObservedEmissionSampleCount: 1,
          collectionCount: 2,
        }),
      ],
      [createRegion("BR-SP", 100)],
    );

    const result = await service.redistributeServices(
      start,
      end,
      "unconstrained",
    );

    expect(result.allocations[0].isPartial).toBe(false);
    expect(result.isPartial).toBe(true);
  });

  it("usa a região de menor intensidade sem exigir ocupação mínima", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 10,
          validMetricCount: 2,
          collectionCount: 2,
        }),
        createServiceIndicator({
          serviceId: 8,
          regionCode: "CA-QC",
          energyKwh: 5,
          validMetricCount: 1,
          collectionCount: 2,
        }),
        createServiceIndicator({
          serviceId: 9,
          regionCode: "BR-SP",
          energyKwh: 0,
          validMetricCount: 0,
          collectionCount: 1,
        }),
      ],
      [
        createRegion("BR-SP", 100),
        createRegion("CA-QC", 20),
        createRegion("DE-BE", 5),
      ],
    );

    const result = await service.redistributeServices(start, end, false);

    expect(
      result.allocations.map(
        ({ serviceId, assignedRegionCode }) => [
          serviceId,
          assignedRegionCode,
        ],
      ),
    ).toEqual([
      [7, "DE-BE"],
      [8, "DE-BE"],
      [9, "BR-SP"],
    ]);
    expect(result.knownProjectedEmissionsGco2e).toBe(75);
    expect(result.isPartial).toBe(true);
  });

  it("preserva exatamente as contagens atuais por região", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 10,
          validMetricCount: 1,
          collectionCount: 1,
        }),
        createServiceIndicator({
          serviceId: 8,
          regionCode: "BR-SP",
          energyKwh: 1,
          validMetricCount: 1,
          collectionCount: 1,
        }),
        createServiceIndicator({
          serviceId: 9,
          regionCode: "CA-QC",
          energyKwh: 4,
          validMetricCount: 1,
          collectionCount: 1,
        }),
        createServiceIndicator({
          serviceId: 10,
          regionCode: "DE-BE",
          energyKwh: 2,
          validMetricCount: 1,
          collectionCount: 1,
        }),
      ],
      [
        createRegion("BR-SP", 100),
        createRegion("CA-QC", 20),
        createRegion("DE-BE", 50),
      ],
    );

    const result = await service.redistributeServices(
      start,
      end,
      "preserve_current_counts",
    );

    expect(
      Object.fromEntries(
        result.regions.map(({ regionCode, serviceCount }) => [
          regionCode,
          serviceCount,
        ]),
      ),
    ).toEqual({
      "BR-SP": 2,
      "CA-QC": 1,
      "DE-BE": 1,
    });
    expect(result.occupancyPolicy).toBe("preserve_current_counts");
  });

  it("distribui oito serviços de forma equilibrada entre cinco regiões", async () => {
    const services = [8, 7, 6, 5, 4, 3, 2, 1].map(
      (energyKwh, index) =>
        createServiceIndicator({
          serviceId: index + 1,
          regionCode: "BR-SP",
          energyKwh,
          validMetricCount: 1,
          collectionCount: 1,
        }),
    );
    mockRedistributionData(services, [
      createRegion("BR-SP", 100),
      createRegion("CA-QC", 20),
      createRegion("DE-BE", 50),
      createRegion("AU-SYD", 80),
      createRegion("JP-TK", 40),
    ]);

    const result = await service.redistributeServices(start, end, "balanced");
    const serviceCounts = result.regions
      .map(({ serviceCount }) => serviceCount)
      .sort((left, right) => left - right);

    expect(serviceCounts).toEqual([1, 1, 2, 2, 2]);
    expect(result.occupancyPolicy).toBe("balanced");
    expect(result.allocations).toHaveLength(8);
  });

  it("retorna inviabilidade quando serviços sem energia impedem o balanceamento", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 0,
          validMetricCount: 0,
          collectionCount: 1,
        }),
        createServiceIndicator({
          serviceId: 8,
          regionCode: "BR-SP",
          energyKwh: 0,
          validMetricCount: 0,
          collectionCount: 1,
        }),
        createServiceIndicator({
          serviceId: 9,
          regionCode: "BR-SP",
          energyKwh: 5,
          validMetricCount: 1,
          collectionCount: 1,
        }),
      ],
      [
        createRegion("BR-SP", 100),
        createRegion("CA-QC", 20),
        createRegion("DE-BE", 80),
      ],
    );

    await expect(
      service.redistributeServices(start, end, "balanced"),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: "REDISTRIBUTION_INFEASIBLE",
    });
  });

  it("considera viável uma distribuição balanceada quando há menos serviços que regiões", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 10,
          validMetricCount: 1,
          collectionCount: 1,
        }),
        createServiceIndicator({
          serviceId: 8,
          regionCode: "BR-SP",
          energyKwh: 5,
          validMetricCount: 1,
          collectionCount: 1,
        }),
      ],
      [
        createRegion("BR-SP", 100),
        createRegion("CA-QC", 20),
        createRegion("DE-BE", 80),
      ],
    );

    const result = await service.redistributeServices(start, end, "balanced");
    const serviceCounts = result.regions
      .map(({ serviceCount }) => serviceCount)
      .sort((left, right) => left - right);

    expect(serviceCounts).toEqual([0, 1, 1]);
  });

  it("não preserva a ocupação atual se uma das regiões não está elegível", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 10,
          validMetricCount: 1,
          collectionCount: 1,
        }),
        createServiceIndicator({
          serviceId: 8,
          regionCode: "CA-QC",
          energyKwh: 5,
          validMetricCount: 1,
          collectionCount: 1,
        }),
      ],
      [createRegion("BR-SP", 100)],
    );

    await expect(
      service.redistributeServices(
        start,
        end,
        "preserve_current_counts",
      ),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: "REDISTRIBUTION_INFEASIBLE",
    });
  });

  it("não otimiza quando todas as intensidades de carbono estão vencidas", async () => {
    mockRedistributionData(
      [
        createServiceIndicator({
          serviceId: 7,
          regionCode: "BR-SP",
          energyKwh: 10,
          validMetricCount: 1,
          collectionCount: 1,
        }),
      ],
      [createRegion("BR-SP", 100, new Date(Date.now() - 301_000))],
    );

    await expect(
      service.redistributeServices(start, end, false),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "NO_FRESH_REDISTRIBUTION_REGIONS",
    });
  });
});

describe("ProjecoesService.listAvailableRegions", () => {
  const listAvailableRegions = vi.fn();
  const service = new ProjecoesService(
    {
      getServiceHistory: vi.fn(),
    },
    {
      findLatestRegionalSnapshots: vi.fn(),
      listAvailableRegions,
    },
    300_000,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna as regiões disponíveis com o snapshot mais recente", async () => {
    listAvailableRegions.mockResolvedValue([
      {
        regionCode: "BR-SP",
        country: "Brasil",
        region: "São Paulo",
        city: null,

        latitude: -23.55,
        longitude: -46.63,

        carbonIntensityGco2ePerKwh: 85,
        renewableSharePercent: 83,

        registeredAt: new Date(
          "2026-11-17T12:00:00.000Z",
        ),
      },

      {
        regionCode: "CA-QC",
        country: "Canadá",
        region: "Quebec",
        city: null,

        latitude: 46.81,
        longitude: -71.21,

        carbonIntensityGco2ePerKwh: 25,
        renewableSharePercent: 95,

        registeredAt: new Date(
          "2026-11-17T12:00:00.000Z",
        ),
      },
    ]);

    const result =
      await service.listAvailableRegions();

    expect(result).toEqual([
      {
        regionCode: "BR-SP",
        country: "Brasil",
        region: "São Paulo",
        city: null,

        latitude: -23.55,
        longitude: -46.63,

        carbonIntensityGco2ePerKwh: 85,
        renewableSharePercent: 83,

        snapshotRegisteredAt: new Date(
          "2026-11-17T12:00:00.000Z",
        ),
      },

      {
        regionCode: "CA-QC",
        country: "Canadá",
        region: "Quebec",
        city: null,

        latitude: 46.81,
        longitude: -71.21,

        carbonIntensityGco2ePerKwh: 25,
        renewableSharePercent: 95,

        snapshotRegisteredAt: new Date(
          "2026-11-17T12:00:00.000Z",
        ),
      },
    ]);

    expect(
      listAvailableRegions,
    ).toHaveBeenCalledTimes(1);
  });
});
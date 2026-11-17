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

vi.mock("./projecoes.repository.js", () => ({
  ProjecoesRepository: class {},
}));

import { ProjecoesService } from "./projecoes.service.js";

describe("ProjecoesService.projectLocation", () => {
  const getServiceHistory = vi.fn();
  const findLatestRegionalSnapshots = vi.fn();
  const listAvailableRegions = vi.fn();

  const service = new ProjecoesService(
    {
      getServiceHistory,
    },
    {
      findLatestRegionalSnapshots,
        listAvailableRegions,
    },
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

describe("ProjecoesService.listAvailableRegions", () => {
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
}

);
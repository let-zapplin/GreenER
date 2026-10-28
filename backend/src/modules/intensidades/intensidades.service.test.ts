import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchCarbonRegions: vi.fn(),
  findLocationByRegion: vi.fn(),
  createLocation: vi.fn(),
  createCarbonIntensity: vi.fn(),
  listAllIntensities: vi.fn(),
  findForCollection: vi.fn(),
}));

vi.mock("../../config/env.js", () => ({
  env: { carbonIntensityMaxAgeMs: 60_000 },
}));

vi.mock("../../integrations/carbon-api.js", () => ({
  fetchCarbonRegions: mocks.fetchCarbonRegions,
}));

vi.mock("./intensidades.repository.js", () => ({
  IntensidadesRepository: vi.fn(class {
    findLocationByRegion = mocks.findLocationByRegion;
    createLocation = mocks.createLocation;
    createCarbonIntensity = mocks.createCarbonIntensity;
    listAllIntensities = mocks.listAllIntensities;
    findForCollection = mocks.findForCollection;
  }),
}));

import { IntensidadesService } from "./intensidades.service.js";

const regionCatalog = {
  regions: [
    {
      code: "br-sudeste",
      country: "Brazil",
      region: "Sudeste",
      city: "Sao Paulo",
      latitude: -23.5505,
      longitude: -46.6333,
      carbon_intensity_gco2e_per_kwh: 85,
      renewable_share_percent: 83,
    },
  ],
  total: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchCarbonRegions.mockResolvedValue(regionCatalog);
  mocks.findLocationByRegion.mockResolvedValue({ id_location: 42 });
  mocks.createLocation.mockResolvedValue({ id_location: 42 });
  mocks.createCarbonIntensity.mockResolvedValue({});
});

describe("IntensidadesService", () => {
  it("mapeia o catálogo externo para o modelo interno", async () => {
    const result = await new IntensidadesService().discoverIntensities();

    expect(result).toEqual([
      {
        regionCode: "br-sudeste",
        country: "Brazil",
        region: "Sudeste",
        city: "Sao Paulo",
        latitude: -23.5505,
        longitude: -46.6333,
        carbonIntensity: 85,
        renewableShare: 83,
      },
    ]);
  });

  it("cria um snapshot regional em cada sincronização", async () => {
    const service = new IntensidadesService();

    await expect(service.saveIntensity()).resolves.toEqual({ inserted: 1 });
    await expect(service.saveIntensity()).resolves.toEqual({ inserted: 1 });

    expect(mocks.findLocationByRegion).toHaveBeenCalledTimes(2);
    expect(mocks.createCarbonIntensity).toHaveBeenCalledTimes(2);
    expect(mocks.createCarbonIntensity).toHaveBeenCalledWith(
      expect.objectContaining({
        idLocation: 42,
        carbonIntensity: 85,
        renewableShare: 83,
        registeredAt: expect.any(Date),
      }),
    );
  });

  it("usa o limite configurado ao buscar o fator temporal", async () => {
    const service = new IntensidadesService();
    mocks.findForCollection.mockResolvedValue(null);

    await expect(service.findIntensityForCollection("12")).resolves.toBeNull();
    expect(mocks.findForCollection).toHaveBeenCalledWith("12", 60_000);
  });
});

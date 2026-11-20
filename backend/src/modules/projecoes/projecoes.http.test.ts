import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/*
 * O app importa módulos que dependem de env.ts.
 *
 * Neste teste HTTP usamos valores fixos para que a suíte
 * não dependa do arquivo .env da máquina.
 */
vi.mock("../../config/env.js", () => ({
  env: {
    nodeEnv: "test",
    port: 3000,

    metricsApiUrl: "http://metrics-api.test",
    carbonApiUrl: "http://carbon-api.test",

    externalApiTimeoutMs: 5_000,
    carbonIntensityMaxAgeMs: 300_000,

    serviceSyncIntervalMs: 300_000,
    carbonIntensitySyncIntervalMs: 300_000,
    metricsCollectionIntervalMs: 60_000,
  },
}));

import request from "supertest";

import app from "../../app.js";

import { createToken } from "../../shared/utils/jwt.util.js";

import { IndicadoresRepository } from "../indicadores/indicadores.repository.js";

import { ProjecoesRepository } from "./projecoes.repository.js";

beforeEach(() => {
  vi.stubEnv(
    "JWT_SECRET",
    "segredo-exclusivo-deste-teste",
  );

  vi.stubEnv(
    "JWT_EXPIRES_IN",
    "15m",
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("HTTP da projeção ambiental por localização", () => {
  it("retorna 401 quando não recebe token", async () => {
    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const consultarRegioes = vi
      .spyOn(
        ProjecoesRepository.prototype,
        "findLatestRegionalSnapshots",
      )
      .mockResolvedValue([]);

    const response = await request(app)
      .post("/api/projecoes/localizacao")
      .send({
        serviceId: 7,

        start:
          "2026-11-16T00:00:00.000Z",

        end:
          "2026-11-17T00:00:00.000Z",

        regionCodes: ["CA-QC"],
      });

    expect(response.status).toBe(401);

    expect(
      consultarHistorico,
    ).not.toHaveBeenCalled();

    expect(
      consultarRegioes,
    ).not.toHaveBeenCalled();
  });

  it("retorna 400 quando não informa as regiões", async () => {
    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const consultarRegioes = vi
      .spyOn(
        ProjecoesRepository.prototype,
        "findLatestRegionalSnapshots",
      )
      .mockResolvedValue([]);

    const token = createToken({
      sub: "1",
    });

    const response = await request(app)
      .post("/api/projecoes/localizacao")
      .set(
        "Authorization",
        `Bearer ${token}`,
      )
      .send({
        serviceId: 7,

        start:
          "2026-11-16T00:00:00.000Z",

        end:
          "2026-11-17T00:00:00.000Z",
      });

    expect(response.status).toBe(400);

    expect(response.body.code).toBe(
      "INVALID_PROJECTION_REGIONS",
    );

    expect(
      consultarHistorico,
    ).not.toHaveBeenCalled();

    expect(
      consultarRegioes,
    ).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o corpo JSON é null", async () => {
    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const consultarRegioes = vi
      .spyOn(
        ProjecoesRepository.prototype,
        "findLatestRegionalSnapshots",
      )
      .mockResolvedValue([]);

    const token = createToken({
      sub: "1",
    });

    const response = await request(app)
      .post("/api/projecoes/localizacao")
      .set(
        "Authorization",
        `Bearer ${token}`,
      )
      .set("Content-Type", "application/json")
      .send("null");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(
      "INVALID_JSON_BODY",
    );
    expect(consultarHistorico).not.toHaveBeenCalled();
    expect(consultarRegioes).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a requisição não tem corpo", async () => {
    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const consultarRegioes = vi
      .spyOn(
        ProjecoesRepository.prototype,
        "findLatestRegionalSnapshots",
      )
      .mockResolvedValue([]);

    const token = createToken({
      sub: "1",
    });

    const response = await request(app)
      .post("/api/projecoes/localizacao")
      .set(
        "Authorization",
        `Bearer ${token}`,
      );

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(
      "INVALID_PROJECTION_REQUEST",
    );
    expect(consultarHistorico).not.toHaveBeenCalled();
    expect(consultarRegioes).not.toHaveBeenCalled();
  });

  it("retorna 400 quando regionCodes contém um valor que não é texto", async () => {
    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const consultarRegioes = vi
      .spyOn(
        ProjecoesRepository.prototype,
        "findLatestRegionalSnapshots",
      )
      .mockResolvedValue([]);

    const token = createToken({
      sub: "1",
    });

    const response = await request(app)
      .post("/api/projecoes/localizacao")
      .set(
        "Authorization",
        `Bearer ${token}`,
      )
      .send({
        serviceId: 7,
        start: "2026-11-16T00:00:00.000Z",
        end: "2026-11-17T00:00:00.000Z",
        regionCodes: ["CA-QC", 42],
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(
      "INVALID_PROJECTION_REGIONS",
    );
    expect(consultarHistorico).not.toHaveBeenCalled();
    expect(consultarRegioes).not.toHaveBeenCalled();
  });

  it("projeta o impacto do serviço em outra região", async () => {
    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([
        {
          id_service: 7,
          name: "Billing API",
          status: "active",
          region_code: "BR-SP",

          collections: [
            {
              id_collection: "101",

              status: "success",

              attempted_at: new Date(
                "2026-11-16T12:00:00.000Z",
              ),

              id_metrics: "201",

              recorded_at: new Date(
                "2026-11-16T12:00:00.000Z",
              ),

              cpu_percent: 50,
              memory_gb: 2,
              disk_gb: 10,
              network_gb: 5,

              collection_interval_seconds: 60,

              carbon_intensity_id: 301,

              carbon_intensity_gco2e_per_kwh:
                200,

              renewable_share_percent: 80,
            },
          ],
        },
      ]);

    const consultarRegioes = vi
      .spyOn(
        ProjecoesRepository.prototype,
        "findLatestRegionalSnapshots",
      )
      .mockResolvedValue([
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

    const token = createToken({
      sub: "1",
    });

    const start =
      "2026-11-16T00:00:00.000Z";

    const end =
      "2026-11-17T00:00:00.000Z";

    const response = await request(app)
      .post("/api/projecoes/localizacao")
      .set(
        "Authorization",
        `Bearer ${token}`,
      )
      .send({
        serviceId: 7,
        start,
        end,

        regionCodes: ["CA-QC"],
      });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      message:
        "Projeção ambiental calculada",

      service: {
        serviceId: 7,
        name: "Billing API",
        currentRegionCode: "BR-SP",
      },

      period: {
        start,
        end,
      },

      validEnergySampleCount: 1,

      totalSampleCount: 1,

      isPartial: false,

      unavailableRegionCodes: [],
    });

    /*
     * Modelo atual:
     *
     * CPU     = 50 W
     * memória = 0,75 W
     * disco   = 0,10 W
     * rede    = 0,10 W
     *
     * total = 50,95 W
     *
     * duração = 60 segundos
     */
    const expectedEnergy =
      (50.95 * 60) / 3_600_000;

    expect(
      response.body.energyKwh,
    ).toBeCloseTo(
      expectedEnergy,
      10,
    );

    expect(
      response.body.scenarios,
    ).toHaveLength(2);

    const currentScenario =
      response.body.scenarios.find(
        (scenario: {
          regionCode: string;
        }) =>
          scenario.regionCode ===
          "BR-SP",
      );

    const projectedScenario =
      response.body.scenarios.find(
        (scenario: {
          regionCode: string;
        }) =>
          scenario.regionCode ===
          "CA-QC",
      );

    expect(currentScenario).toMatchObject({
      regionCode: "BR-SP",
      isCurrent: true,

      carbonIntensityGco2ePerKwh:
        100,

      renewableSharePercent: 80,
    });

    expect(
      currentScenario
        .projectedEmissionsGco2e,
    ).toBeCloseTo(
      expectedEnergy * 100,
      10,
    );

    expect(projectedScenario).toMatchObject({
      regionCode: "CA-QC",
      isCurrent: false,

      carbonIntensityGco2ePerKwh:
        25,

      renewableSharePercent: 95,
    });

    expect(
      projectedScenario
        .projectedEmissionsGco2e,
    ).toBeCloseTo(
      expectedEnergy * 25,
      10,
    );

    expect(
      projectedScenario.differencePercent,
    ).toBeCloseTo(
      -75,
      10,
    );

    expect(
      consultarHistorico,
    ).toHaveBeenCalledTimes(1);

    expect(
      consultarRegioes,
    ).toHaveBeenCalledWith([
      "BR-SP",
      "CA-QC",
    ]);
  });

  it("retorna região indisponível sem inventar dados", async () => {
    vi.spyOn(
      IndicadoresRepository.prototype,
      "findCollectionsForPeriod",
    ).mockResolvedValue([
      {
        id_service: 7,
        name: "Billing API",
        status: "active",
        region_code: "BR-SP",

        collections: [
          {
            id_collection: "101",

            status: "success",

            attempted_at: new Date(
              "2026-11-16T12:00:00.000Z",
            ),

            id_metrics: "201",

            recorded_at: new Date(
              "2026-11-16T12:00:00.000Z",
            ),

            cpu_percent: 50,
            memory_gb: 2,
            disk_gb: 10,
            network_gb: 5,

            collection_interval_seconds: 60,

            carbon_intensity_id: 301,

            carbon_intensity_gco2e_per_kwh:
              100,
          },
        ],
      },
    ]);

    vi.spyOn(
      ProjecoesRepository.prototype,
      "findLatestRegionalSnapshots",
    ).mockResolvedValue([
      {
        regionCode: "BR-SP",

        country: "Brasil",
        region: "São Paulo",
        city: null,

        latitude: -23.55,
        longitude: -46.63,

        carbonIntensityGco2ePerKwh:
          100,

        renewableSharePercent: 80,

        registeredAt: new Date(),
      },
    ]);

    const token = createToken({
      sub: "1",
    });

    const response = await request(app)
      .post("/api/projecoes/localizacao")
      .set(
        "Authorization",
        `Bearer ${token}`,
      )
      .send({
        serviceId: 7,

        start:
          "2026-11-16T00:00:00.000Z",

        end:
          "2026-11-17T00:00:00.000Z",

        regionCodes: [
          "REGIAO-INEXISTENTE",
        ],
      });

    expect(response.status).toBe(200);

    expect(
      response.body.unavailableRegionCodes,
    ).toEqual([
      "REGIAO-INEXISTENTE",
    ]);

    expect(
      response.body.scenarios,
    ).toHaveLength(1);

    expect(
      response.body.scenarios[0]
        .regionCode,
    ).toBe("BR-SP");
    });

    it("retorna as regiões disponíveis para projeção", async () => {
  const consultarRegioes = vi
    .spyOn(
      ProjecoesRepository.prototype,
      "listAvailableRegions",
    )
    .mockResolvedValue([
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

  const token = createToken({
    sub: "1",
  });

  const response = await request(app)
    .get("/api/projecoes/regioes")
    .set(
      "Authorization",
      `Bearer ${token}`,
    );

  expect(response.status).toBe(200);

  expect(response.body.message).toBe(
    "2 regiões disponíveis para projeção",
  );

  expect(response.body.regions).toHaveLength(2);

  expect(response.body.regions[0]).toMatchObject({
    regionCode: "BR-SP",

    country: "Brasil",
    region: "São Paulo",

    carbonIntensityGco2ePerKwh: 85,
    renewableSharePercent: 83,

    snapshotRegisteredAt:
      "2026-11-17T12:00:00.000Z",
  });

  expect(response.body.regions[1]).toMatchObject({
    regionCode: "CA-QC",

    country: "Canadá",
    region: "Quebec",

    carbonIntensityGco2ePerKwh: 25,
    renewableSharePercent: 95,
  });

  expect(
    consultarRegioes,
  ).toHaveBeenCalledTimes(1);
});

it("retorna 401 ao listar regiões sem token", async () => {
  const consultarRegioes = vi
    .spyOn(
      ProjecoesRepository.prototype,
      "listAvailableRegions",
    )
    .mockResolvedValue([]);

  const response = await request(app)
    .get("/api/projecoes/regioes");

  expect(response.status).toBe(401);

  expect(
    consultarRegioes,
  ).not.toHaveBeenCalled();
});

  
});

describe("HTTP da redistribuição de serviços", () => {
  const start = "2026-11-16T00:00:00.000Z";
  const end = "2026-11-17T00:00:00.000Z";

  it("retorna 401 sem token e não consulta os dados", async () => {
    const consultarIndicadores = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);
    const consultarRegioes = vi
      .spyOn(
        ProjecoesRepository.prototype,
        "listAvailableRegions",
      )
      .mockResolvedValue([]);

    const response = await request(app)
      .post("/api/projecoes/redistribuicao")
      .send({
        start,
        end,
        requireServicePerRegion: false,
      });

    expect(response.status).toBe(401);
    expect(consultarIndicadores).not.toHaveBeenCalled();
    expect(consultarRegioes).not.toHaveBeenCalled();
  });

  it("retorna 400 para política inválida ou campos conflitantes", async () => {
    const consultarIndicadores = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);
    const consultarRegioes = vi
      .spyOn(
        ProjecoesRepository.prototype,
        "listAvailableRegions",
      )
      .mockResolvedValue([]);
    const token = createToken({ sub: "1" });

    const response = await request(app)
      .post("/api/projecoes/redistribuicao")
      .set("Authorization", `Bearer ${token}`)
      .send({
        start,
        end,
        occupancyPolicy: "maximum_two",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(
      "INVALID_REDISTRIBUTION_CONSTRAINT",
    );

    const conflictingResponse = await request(app)
      .post("/api/projecoes/redistribuicao")
      .set("Authorization", `Bearer ${token}`)
      .send({
        start,
        end,
        occupancyPolicy: "balanced",
        requireServicePerRegion: true,
      });

    expect(conflictingResponse.status).toBe(400);
    expect(conflictingResponse.body.code).toBe(
      "INVALID_REDISTRIBUTION_CONSTRAINT",
    );
    expect(consultarIndicadores).not.toHaveBeenCalled();
    expect(consultarRegioes).not.toHaveBeenCalled();
  });

  it("retorna a redistribuição calculada para o período", async () => {
    vi.spyOn(
      IndicadoresRepository.prototype,
      "findCollectionsForPeriod",
    ).mockResolvedValue([
      {
        id_service: 7,
        name: "Billing API",
        status: "active",
        region_code: "BR-SP",
        collections: [
          {
            id_collection: "101",
            status: "success",
            attempted_at: new Date("2026-11-16T12:00:00.000Z"),
            id_metrics: "201",
            recorded_at: new Date("2026-11-16T12:00:00.000Z"),
            cpu_percent: 50,
            memory_gb: 2,
            disk_gb: 10,
            network_gb: 5,
            collection_interval_seconds: 45,
            carbon_intensity_id: 301,
            carbon_intensity_gco2e_per_kwh: 100,
          },
        ],
      },
    ]);
    vi.spyOn(
      ProjecoesRepository.prototype,
      "listAvailableRegions",
    ).mockResolvedValue([
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
    const token = createToken({ sub: "1" });

    const response = await request(app)
      .post("/api/projecoes/redistribuicao")
      .set("Authorization", `Bearer ${token}`)
      .send({
        start,
        end,
        occupancyPolicy: "balanced",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Redistribuição de serviços calculada",
    );
    expect(response.body.occupancyPolicy).toBe("balanced");
    expect(response.body.requireServicePerRegion).toBe(true);
    expect(response.body.allocations).toMatchObject([
      {
        serviceId: 7,
        currentRegionCode: "BR-SP",
        assignedRegionCode: "BR-SP",
        validEnergySampleCount: 1,
        totalSampleCount: 1,
        isPartial: false,
      },
    ]);
    expect(response.body.allocations[0].energyKwh).toBeGreaterThan(0);
    expect(
      response.body.allocations[0].observedEmissionsGco2e,
    ).toBeGreaterThan(0);
    expect(
      response.body.allocations[0].validObservedEmissionSampleCount,
    ).toBe(1);
    expect(response.body.regions).toMatchObject([
      {
        regionCode: "BR-SP",
        serviceCount: 1,
        carbonIntensityGco2ePerKwh: 100,
      },
    ]);

    for (const occupancyPolicy of [
      "preserve_current_counts",
      "unconstrained",
    ] as const) {
      const policyResponse = await request(app)
        .post("/api/projecoes/redistribuicao")
        .set("Authorization", `Bearer ${token}`)
        .send({
          start,
          end,
          occupancyPolicy,
        });

      expect(policyResponse.status).toBe(200);
      expect(policyResponse.body.occupancyPolicy).toBe(occupancyPolicy);
    }

    const legacyResponse = await request(app)
      .post("/api/projecoes/redistribuicao")
      .set("Authorization", `Bearer ${token}`)
      .send({
        start,
        end,
        requireServicePerRegion: true,
      });

    expect(legacyResponse.status).toBe(200);
    expect(legacyResponse.body.occupancyPolicy).toBe("balanced");
  });
});
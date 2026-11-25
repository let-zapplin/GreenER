import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { RelatoriosService } from "./relatorios.service.js";

const start =
  "2026-11-24T00:00:00.000Z";

const end =
  "2026-11-25T00:00:00.000Z";

/* ======================================================
   HELPERS — RELATÓRIO INDIVIDUAL
====================================================== */

function createPeriodIndicators() {
  return {
    serviceId: 7,

    name: "Billing API",

    status: "active",

    regionCode: "BR-SP",

    latestSampleInPeriod: null,

    resourceSummary: {
      cpu: {
        averagePercent: 48.8,
        peakPercent: 72,
      },

      memory: {
        averageGb: 3.2,
        peakGb: 4.1,
      },

      disk: {
        averageGb: 18.53,
        peakGb: 20.2,
      },

      network: {
        totalGb: 0.73,
      },
    },

    energyBreakdown: {
      cpuKwh: 0.02,
      memoryKwh: 0.01,
      diskKwh: 0.005,
      networkKwh: 0.006765,
    },

    regionalContext: {
      regionCode: "BR-SP",

      carbonIntensityGco2ePerKwh:
        36.16,

      renewableSharePercent: 82,
    },

    periodTotals: {
      energyKwh: 0.041765,

      energyKwhWithCarbonIntensity:
        0.041765,

      emissionsGco2e: 1.51,

      collectionCount: 2,

      validMetricCount: 1,

      validCarbonIntensityCount: 1,

      metricCoveragePercent: 50,

      carbonIntensityCoveragePercent:
        100,

      isPartial: true,

      gaps: [],
    },
  };
}

function createHistory() {
  return {
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

        attemptedAt:
          new Date(
            "2026-11-24T10:00:00.000Z",
          ),

        status: "success",

        metrics: null,

        collectionIntervalSeconds: 60,

        energyKwh: 0.02,

        emissionsGco2e: 0.72,

        carbonIntensityGco2ePerKwh:
          36,

        gapReason: null,
      },

      {
        collectionId: "102",

        attemptedAt:
          new Date(
            "2026-11-24T10:01:00.000Z",
          ),

        status: "unavailable",

        metrics: null,

        collectionIntervalSeconds: null,

        energyKwh: null,

        emissionsGco2e: null,

        carbonIntensityGco2ePerKwh:
          null,

        gapReason: "unavailable",
      },
    ],
  };
}

function createListedService() {
  return {
    id_service: 7,

    external_id: "billing-api",

    name: "Billing API",

    status: "active",

    last_seen_at:
      new Date(
        "2026-11-25T00:00:00.000Z",
      ),

    region_code: "BR-SP",

    country: "Brasil",

    region: "São Paulo",

    city: "São Paulo",

    latitude: -23.55,

    longitude: -46.63,

    last_collection_status:
      "success" as const,

    last_collection_at:
      new Date(
        "2026-11-24T10:00:00.000Z",
      ),
  };
}

/* ======================================================
   HELPERS — RELATÓRIO COMPARATIVO
====================================================== */

function createComparisonIndicators(
  serviceId: number,
  name: string,
  energyKwh: number,
) {
  return {
    serviceId,
    name,

    status: "active",

    regionCode: "BR-SP",

    latestSampleInPeriod: null,

    resourceSummary: {
      cpu: {
        averagePercent:
          40 + serviceId,

        peakPercent:
          70 + serviceId,
      },

      memory: {
        averageGb:
          2 + serviceId,

        peakGb:
          3 + serviceId,
      },

      disk: {
        averageGb:
          10 + serviceId,

        peakGb:
          15 + serviceId,
      },

      network: {
        totalGb:
          5 + serviceId,
      },
    },

    energyBreakdown: {
      cpuKwh: 0.01,
      memoryKwh: 0.01,
      diskKwh: 0.01,
      networkKwh: 0.01,
    },

    regionalContext: {
      regionCode: "BR-SP",

      carbonIntensityGco2ePerKwh:
        100,

      renewableSharePercent:
        80,
    },

    periodTotals: {
      energyKwh,

      energyKwhWithCarbonIntensity:
        energyKwh,

      emissionsGco2e:
        energyKwh * 100,

      collectionCount: 3,

      validMetricCount: 3,

      validCarbonIntensityCount: 3,

      metricCoveragePercent: 100,

      carbonIntensityCoveragePercent:
        100,

      isPartial: false,

      gaps: [],
    },
  };
}

function createComparisonHistory(
  serviceId: number,
  name: string,
) {
  return {
    period: {
      start:
        new Date(
          "2026-11-24T10:00:00.000Z",
        ),

      end:
        new Date(
          "2026-11-24T10:10:00.000Z",
        ),

      collectionIntervalMs:
        60_000,

      displayIntervalMs:
        60_000,
    },

    service: {
      serviceId,
      name,
      status: "active",
      regionCode: "BR-SP",
    },

    samples: [
      {
        collectionId:
          `${serviceId}-1`,

        attemptedAt:
          new Date(
            "2026-11-24T10:00:00.000Z",
          ),

        status: "success",

        metrics: {
          cpuPercent: 40,
          memoryGb: 2,
          diskGb: 10,
          networkGb: 1,
        },

        collectionIntervalSeconds:
          60,

        energyKwh:
          0.01,

        emissionsGco2e:
          1,

        carbonIntensityGco2ePerKwh:
          100,

        gapReason: null,
      },

      /*
       * Há quatro minutos entre
       * esta amostra e a anterior.
       *
       * Como o intervalo esperado
       * é 1 minuto, deve surgir
       * um gap temporal.
       */
      {
        collectionId:
          `${serviceId}-2`,

        attemptedAt:
          new Date(
            "2026-11-24T10:04:00.000Z",
          ),

        status: "success",

        metrics: {
          cpuPercent: 50,
          memoryGb: 3,
          diskGb: 12,
          networkGb: 2,
        },

        collectionIntervalSeconds:
          60,

        energyKwh:
          0.02,

        emissionsGco2e:
          2,

        carbonIntensityGco2ePerKwh:
          100,

        gapReason: null,
      },
    ],
  };
}

function createCatalogService(
  serviceId: number,
  name: string,
) {
  return {
    id_service: serviceId,

    external_id:
      `service-${serviceId}`,

    name,

    status: "active",

    last_seen_at: new Date(),

    region_code: "BR-SP",

    country: "Brasil",

    region: "São Paulo",

    city: "São Paulo",

    latitude: -23.55,

    longitude: -46.63,

    last_collection_status:
      "success" as const,

    last_collection_at:
      new Date(),
  };
}

/* ======================================================
   RELATÓRIO INDIVIDUAL
====================================================== */

describe(
  "RelatoriosService.buildIndividualAnalysisReport",
  () => {
    const getServicePeriodIndicators =
      vi.fn();

    const getServiceHistory =
      vi.fn();

    const listAll =
      vi.fn();

    const service =
      new RelatoriosService(
        {
          getServicePeriodIndicators,
          getServiceHistory,
        },

        {
          listAll,
        },
      );

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it(
      "monta o relatório reutilizando indicadores, histórico e catálogo do serviço",
      async () => {
        getServicePeriodIndicators
          .mockResolvedValue(
            createPeriodIndicators(),
          );

        getServiceHistory
          .mockResolvedValue(
            createHistory(),
          );

        listAll
          .mockResolvedValue([
            createListedService(),
          ]);

        const result =
          await service
            .buildIndividualAnalysisReport(
              7,
              start,
              end,
            );

        expect(
          getServicePeriodIndicators,
        ).toHaveBeenCalledWith(
          7,
          start,
          end,
        );

        expect(
          getServiceHistory,
        ).toHaveBeenCalledWith(
          7,
          start,
          end,
        );

        expect(
          listAll,
        ).toHaveBeenCalledOnce();

        expect(
          result.service,
        ).toEqual({
          serviceId: 7,

          name: "Billing API",

          status: "active",

          location: {
            regionCode: "BR-SP",
            country: "Brasil",
            region: "São Paulo",
            city: "São Paulo",
          },
        });

        expect(
          result.environmentalSummary,
        ).toEqual({
          energyKwh: 0.041765,

          emissionsGco2e: 1.51,

          metricCoveragePercent: 50,

          carbonIntensityCoveragePercent:
            100,

          isPartial: true,
        });

        expect(
          result.resourceSummary
            .cpu.averagePercent,
        ).toBe(48.8);

        expect(
          result.history,
        ).toEqual([
          {
            attemptedAt:
              "2026-11-24T10:00:00.000Z",

            energyKwh: 0.02,

            emissionsGco2e: 0.72,

            gapReason: null,
          },

          {
            attemptedAt:
              "2026-11-24T10:01:00.000Z",

            energyKwh: null,

            emissionsGco2e: null,

            gapReason:
              "unavailable",
          },
        ]);

        expect(
          result.generatedAt,
        ).toBeInstanceOf(Date);
      },
    );

    it(
      "retorna erro 404 quando o serviço não existe no catálogo",
      async () => {
        getServicePeriodIndicators
          .mockResolvedValue(
            createPeriodIndicators(),
          );

        getServiceHistory
          .mockResolvedValue(
            createHistory(),
          );

        listAll
          .mockResolvedValue([]);

        await expect(
          service
            .buildIndividualAnalysisReport(
              7,
              start,
              end,
            ),
        ).rejects.toMatchObject({
          statusCode: 404,

          code:
            "REPORT_SERVICE_NOT_FOUND",

          message:
            "Serviço não encontrado para geração do relatório",
        });
      },
    );
  },
);

/* ======================================================
   RELATÓRIO COMPARATIVO
====================================================== */

describe(
  "RelatoriosService.buildComparisonAnalysisReport",
  () => {
    it(
      "monta comparação entre serviços e calcula maior, menor e diferença",
      async () => {
        const getServicePeriodIndicators =
          vi.fn(
            async (
              serviceId: number,
            ) => {
              if (serviceId === 1) {
                return createComparisonIndicators(
                  1,
                  "Billing API",
                  0.1,
                );
              }

              if (serviceId === 2) {
                return createComparisonIndicators(
                  2,
                  "Checkout Worker",
                  0.3,
                );
              }

              return createComparisonIndicators(
                3,
                "Recommendation AI",
                0.2,
              );
            },
          );

        const getServiceHistory =
          vi.fn(
            async (
              serviceId: number,
            ) => {
              if (serviceId === 1) {
                return createComparisonHistory(
                  1,
                  "Billing API",
                );
              }

              if (serviceId === 2) {
                return createComparisonHistory(
                  2,
                  "Checkout Worker",
                );
              }

              return createComparisonHistory(
                3,
                "Recommendation AI",
              );
            },
          );

        const listAll =
          vi.fn().mockResolvedValue([
            createCatalogService(
              1,
              "Billing API",
            ),

            createCatalogService(
              2,
              "Checkout Worker",
            ),

            createCatalogService(
              3,
              "Recommendation AI",
            ),
          ]);

        const service =
          new RelatoriosService(
            {
              getServicePeriodIndicators,
              getServiceHistory,
            },

            {
              listAll,
            },
          );

        const result =
          await service
            .buildComparisonAnalysisReport(
              [1, 2, 3],

              "2026-11-24T10:00:00.000Z",

              "2026-11-24T10:10:00.000Z",

              "energy",
            );

        expect(
          result.metric,
        ).toEqual({
          value: "energy",

          label: "Energia",

          unit: "kWh",

          periodAggregationLabel:
            "Total no período",
        });

        expect(
          result.services,
        ).toHaveLength(3);

        expect(
          result.failedServices,
        ).toHaveLength(0);

        expect(
          result.summary.highestServiceId,
        ).toBe(2);

        expect(
          result.summary.lowestServiceId,
        ).toBe(1);

        expect(
          result.summary.highestValue,
        ).toBe(0.3);

        expect(
          result.summary.lowestValue,
        ).toBe(0.1);

        expect(
          result.summary.difference,
        ).toBeCloseTo(0.2);

        expect(
          result.summary.isPartial,
        ).toBe(false);
      },
    );

    it(
      "insere uma quebra no histórico quando existe gap temporal entre coletas",
      async () => {
        const getServicePeriodIndicators =
          vi.fn(
            async (
              serviceId: number,
            ) =>
              createComparisonIndicators(
                serviceId,
                `Service ${serviceId}`,
                0.1,
              ),
          );

        const getServiceHistory =
          vi.fn(
            async (
              serviceId: number,
            ) =>
              createComparisonHistory(
                serviceId,
                `Service ${serviceId}`,
              ),
          );

        const listAll =
          vi.fn().mockResolvedValue([
            createCatalogService(
              1,
              "Service 1",
            ),

            createCatalogService(
              2,
              "Service 2",
            ),
          ]);

        const service =
          new RelatoriosService(
            {
              getServicePeriodIndicators,
              getServiceHistory,
            },

            {
              listAll,
            },
          );

        const result =
          await service
            .buildComparisonAnalysisReport(
              [1, 2],

              "2026-11-24T10:00:00.000Z",

              "2026-11-24T10:10:00.000Z",

              "energy",
            );

        const firstHistory =
          result.services[0].history;

        expect(
          firstHistory,
        ).toHaveLength(3);

        expect(
          firstHistory[0],
        ).toMatchObject({
          value: 0.01,

          temporalGap: false,
        });

        expect(
          firstHistory[1],
        ).toMatchObject({
          value: null,

          gapReason: null,

          temporalGap: true,
        });

        expect(
          firstHistory[2],
        ).toMatchObject({
          value: 0.02,

          temporalGap: false,
        });
      },
    );

    it(
      "mantém a comparação quando um dos três serviços falha",
      async () => {
        const getServicePeriodIndicators =
          vi.fn(
            async (
              serviceId: number,
            ) => {
              if (serviceId === 2) {
                throw new Error(
                  "Falha simulada",
                );
              }

              return createComparisonIndicators(
                serviceId,

                serviceId === 1
                  ? "Billing API"
                  : "Recommendation AI",

                serviceId === 1
                  ? 0.1
                  : 0.2,
              );
            },
          );

        const getServiceHistory =
          vi.fn(
            async (
              serviceId: number,
            ) => {
              if (serviceId === 2) {
                throw new Error(
                  "Falha simulada",
                );
              }

              return createComparisonHistory(
                serviceId,

                serviceId === 1
                  ? "Billing API"
                  : "Recommendation AI",
              );
            },
          );

        const listAll =
          vi.fn().mockResolvedValue([
            createCatalogService(
              1,
              "Billing API",
            ),

            createCatalogService(
              2,
              "Checkout Worker",
            ),

            createCatalogService(
              3,
              "Recommendation AI",
            ),
          ]);

        const service =
          new RelatoriosService(
            {
              getServicePeriodIndicators,
              getServiceHistory,
            },

            {
              listAll,
            },
          );

        const result =
          await service
            .buildComparisonAnalysisReport(
              [1, 2, 3],

              "2026-11-24T10:00:00.000Z",

              "2026-11-24T10:10:00.000Z",

              "energy",
            );

        expect(
          result.services.map(
            (item) =>
              item.serviceId,
          ),
        ).toEqual([
          1,
          3,
        ]);

        expect(
          result.failedServices,
        ).toEqual([
          {
            serviceId: 2,

            name:
              "Checkout Worker",
          },
        ]);

        expect(
          result.summary.isPartial,
        ).toBe(true);

        expect(
          result.summary.highestServiceId,
        ).toBe(3);

        expect(
          result.summary.lowestServiceId,
        ).toBe(1);

        expect(
          result.summary.difference,
        ).toBeCloseTo(0.1);
      },
    );

    it(
      "rejeita comparação com menos de dois serviços",
      async () => {
        const service =
          new RelatoriosService(
            {
              getServicePeriodIndicators:
                vi.fn(),

              getServiceHistory:
                vi.fn(),
            },

            {
              listAll:
                vi.fn(),
            },
          );

        await expect(
          service
            .buildComparisonAnalysisReport(
              [1],

              "2026-11-24T10:00:00.000Z",

              "2026-11-24T10:10:00.000Z",

              "energy",
            ),
        ).rejects.toMatchObject({
          statusCode: 400,

          code:
            "INVALID_REPORT_COMPARISON_SERVICES",
        });
      },
    );

    it(
      "rejeita serviços duplicados",
      async () => {
        const service =
          new RelatoriosService(
            {
              getServicePeriodIndicators:
                vi.fn(),

              getServiceHistory:
                vi.fn(),
            },

            {
              listAll:
                vi.fn(),
            },
          );

        await expect(
          service
            .buildComparisonAnalysisReport(
              [1, 1],

              "2026-11-24T10:00:00.000Z",

              "2026-11-24T10:10:00.000Z",

              "energy",
            ),
        ).rejects.toMatchObject({
          statusCode: 400,

          code:
            "INVALID_REPORT_COMPARISON_SERVICES",
        });
      },
    );
  },
);

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
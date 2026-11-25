import {
  describe,
  expect,
  it,
} from "vitest";



import {  renderComparisonAnalysisPdf, renderIndividualAnalysisPdf } from "./relatorios.pdf.js";

import type { IndividualAnalysisReportData } from "./relatorios.types.js";

function createReportData(): IndividualAnalysisReportData {
  return {
    generatedAt:
      new Date(
        "2026-11-25T12:00:00.000Z",
      ),

    period: {
      start:
        "2026-11-24T00:00:00.000Z",

      end:
        "2026-11-25T00:00:00.000Z",
    },

    service: {
      serviceId: 7,

      name:
        "Billing API",

      status:
        "active",

      location: {
        regionCode:
          "BR-SP",

        country:
          "Brasil",

        region:
          "São Paulo",

        city:
          "São Paulo",
      },
    },

    environmentalSummary: {
      energyKwh:
        0.041765,

      emissionsGco2e:
        1.51,

      metricCoveragePercent:
        50,

      carbonIntensityCoveragePercent:
        100,

      isPartial:
        true,
    },

    resourceSummary: {
      cpu: {
        averagePercent:
          48.8,

        peakPercent:
          72,
      },

      memory: {
        averageGb:
          3.2,

        peakGb:
          4.1,
      },

      disk: {
        averageGb:
          18.53,

        peakGb:
          20.2,
      },

      network: {
        totalGb:
          0.73,
      },
    },

    history: [
      {
        attemptedAt:
          "2026-11-24T10:00:00.000Z",

        energyKwh:
          0.018,

        emissionsGco2e:
          0.65,

        gapReason:
          null,
      },

      {
        attemptedAt:
          "2026-11-24T10:01:00.000Z",

        energyKwh:
          0.02,

        emissionsGco2e:
          0.72,

        gapReason:
          null,
      },

      {
        attemptedAt:
          "2026-11-24T10:02:00.000Z",

        energyKwh:
          null,

        emissionsGco2e:
          null,

        gapReason:
          "unavailable",
      },

      {
        attemptedAt:
          "2026-11-24T10:03:00.000Z",

        energyKwh:
          0.023,

        emissionsGco2e:
          0.83,

        gapReason:
          null,
      },
    ],
  };
}

describe(
  "renderIndividualAnalysisPdf",
  () => {
    it(
      "gera um buffer contendo um documento PDF válido",
      async () => {
        const pdf =
          await renderIndividualAnalysisPdf(
            createReportData(),
          );

        expect(
          Buffer.isBuffer(pdf),
        ).toBe(true);

        expect(
          pdf.length,
        ).toBeGreaterThan(1000);

        /*
         * Todo arquivo PDF começa com
         * uma assinatura semelhante a:
         *
         * %PDF-1.3
         */
        expect(
          pdf
            .subarray(0, 5)
            .toString("ascii"),
        ).toBe("%PDF-");

        /*
         * Documentos PDF válidos terminam
         * com o marcador %%EOF.
         */
        expect(
          pdf
            .toString(
              "latin1",
              Math.max(
                0,
                pdf.length - 32,
              ),
            ),
        ).toContain("%%EOF");
      },
    );

    it(
      "gera o relatório mesmo quando não existem amostras de energia válidas",
      async () => {
        const report =
          createReportData();

        report.history =
          report.history.map(
            (sample) => ({
              ...sample,

              energyKwh:
                null,

              emissionsGco2e:
                null,

              gapReason:
                "unavailable",
            }),
          );

        const pdf =
          await renderIndividualAnalysisPdf(
            report,
          );

        expect(
          Buffer.isBuffer(pdf),
        ).toBe(true);

        expect(
          pdf
            .subarray(0, 5)
            .toString("ascii"),
        ).toBe("%PDF-");

        expect(
          pdf.length,
        ).toBeGreaterThan(1000);
      },
    );
  },
);

describe(
  "renderComparisonAnalysisPdf",
  () => {
    it(
      "gera um PDF comparativo válido",
      async () => {
        const pdf =
          await renderComparisonAnalysisPdf({
            generatedAt:
              new Date(
                "2026-11-25T15:00:00.000Z",
              ),

            period: {
              start:
                "2026-11-24T10:00:00.000Z",

              end:
                "2026-11-24T10:10:00.000Z",
            },

            metric: {
              value: "energy",

              label: "Energia",

              unit: "kWh",

              periodAggregationLabel:
                "Total no período",
            },

            services: [
              {
                serviceId: 1,

                name: "Billing API",

                status: "active",

                regionCode: "BR-SP",

                periodValue: 0.1,

                isPartial: false,

                history: [
                  {
                    attemptedAt:
                      "2026-11-24T10:00:00.000Z",

                    value: 0.01,

                    gapReason: null,

                    temporalGap: false,
                  },

                  {
                    attemptedAt:
                      "2026-11-24T10:01:00.000Z",

                    value: 0.015,

                    gapReason: null,

                    temporalGap: false,
                  },

                  {
                    attemptedAt:
                      "2026-11-24T10:02:00.000Z",

                    value: null,

                    gapReason: null,

                    temporalGap: true,
                  },

                  {
                    attemptedAt:
                      "2026-11-24T10:04:00.000Z",

                    value: 0.02,

                    gapReason: null,

                    temporalGap: false,
                  },
                ],
              },

              {
                serviceId: 2,

                name:
                  "Checkout Worker",

                status: "active",

                regionCode: "BR-SP",

                periodValue: 0.3,

                isPartial: false,

                history: [
                  {
                    attemptedAt:
                      "2026-11-24T10:00:00.000Z",

                    value: 0.03,

                    gapReason: null,

                    temporalGap: false,
                  },

                  {
                    attemptedAt:
                      "2026-11-24T10:01:00.000Z",

                    value: 0.035,

                    gapReason: null,

                    temporalGap: false,
                  },

                  {
                    attemptedAt:
                      "2026-11-24T10:04:00.000Z",

                    value: 0.04,

                    gapReason: null,

                    temporalGap: false,
                  },
                ],
              },

              {
                serviceId: 3,

                name:
                  "Recommendation AI",

                status: "active",

                regionCode: "BR-SP",

                periodValue: 0.2,

                isPartial: true,

                history: [
                  {
                    attemptedAt:
                      "2026-11-24T10:00:00.000Z",

                    value: 0.02,

                    gapReason: null,

                    temporalGap: false,
                  },

                  {
                    attemptedAt:
                      "2026-11-24T10:01:00.000Z",

                    value: null,

                    gapReason:
                      "unavailable",

                    temporalGap: false,
                  },

                  {
                    attemptedAt:
                      "2026-11-24T10:04:00.000Z",

                    value: 0.025,

                    gapReason: null,

                    temporalGap: false,
                  },
                ],
              },
            ],

            failedServices: [],

            summary: {
              highestServiceId: 2,

              lowestServiceId: 1,

              highestValue: 0.3,

              lowestValue: 0.1,

              difference: 0.2,

              isPartial: true,
            },
          });

        expect(
          Buffer.isBuffer(pdf),
        ).toBe(true);

        expect(
          pdf.length,
        ).toBeGreaterThan(
          1_000,
        );

        expect(
          pdf.subarray(
            0,
            5,
          ).toString(),
        ).toBe("%PDF-");

        expect(
          pdf
            .toString("latin1")
            .includes("%%EOF"),
        ).toBe(true);
      },
    );

    it(
      "gera PDF mesmo quando um serviço falhou na comparação",
      async () => {
        const pdf =
          await renderComparisonAnalysisPdf({
            generatedAt:
              new Date(),

            period: {
              start:
                "2026-11-24T10:00:00.000Z",

              end:
                "2026-11-24T10:10:00.000Z",
            },

            metric: {
              value: "energy",

              label: "Energia",

              unit: "kWh",

              periodAggregationLabel:
                "Total no período",
            },

            services: [
              {
                serviceId: 1,

                name: "Billing API",

                status: "active",

                regionCode: "BR-SP",

                periodValue: 0.1,

                isPartial: false,

                history: [],
              },

              {
                serviceId: 3,

                name:
                  "Recommendation AI",

                status: "active",

                regionCode: "BR-SP",

                periodValue: 0.2,

                isPartial: false,

                history: [],
              },
            ],

            failedServices: [
              {
                serviceId: 2,

                name:
                  "Checkout Worker",
              },
            ],

            summary: {
              highestServiceId: 3,

              lowestServiceId: 1,

              highestValue: 0.2,

              lowestValue: 0.1,

              difference: 0.1,

              isPartial: true,
            },
          });

        expect(
          Buffer.isBuffer(pdf),
        ).toBe(true);

        expect(
          pdf.length,
        ).toBeGreaterThan(
          1_000,
        );

        expect(
          pdf.subarray(
            0,
            5,
          ).toString(),
        ).toBe("%PDF-");
      },
    );
  },
);
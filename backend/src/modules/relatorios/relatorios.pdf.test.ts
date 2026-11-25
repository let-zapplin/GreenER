import {
  describe,
  expect,
  it,
} from "vitest";

import { renderIndividualAnalysisPdf } from "./relatorios.pdf.js";

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
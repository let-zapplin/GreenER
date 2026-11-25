import express from "express";
import request from "supertest";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createToken } from "../../shared/utils/jwt.util.js";

import { errorMiddleware } from "../../shared/middlewares/error.middleware.js";

import { RelatoriosController } from "./relatorios.controller.js";

import { createRelatoriosRouter } from "./relatorios.routes.js";

import type { IndividualAnalysisReportData } from "./relatorios.types.js";

/* ======================================================
   DADOS FALSOS DO RELATÓRIO
====================================================== */

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
        100,

      carbonIntensityCoveragePercent:
        100,

      isPartial:
        false,
    },

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

    history: [],
  };
}

/* ======================================================
   AMBIENTE DE TESTE
====================================================== */

beforeEach(() => {
  vi.stubEnv(
    "JWT_SECRET",
    "segredo-exclusivo-relatorios",
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

/* ======================================================
   TESTES
====================================================== */

describe(
  "HTTP dos relatórios ambientais",
  () => {
    function createTestApp() {
      const buildIndividualAnalysisReport =
        vi.fn();

      const renderPdf =
        vi.fn();

      const controller =
        new RelatoriosController(
          {
            buildIndividualAnalysisReport,
          },

          renderPdf,
        );

      const app = express();

      app.use(express.json());

      app.use(
        "/api/relatorios",
        createRelatoriosRouter(
          controller,
        ),
      );

      app.use(errorMiddleware);

      return {
        app,

        buildIndividualAnalysisReport,

        renderPdf,
      };
    }

    it(
      "retorna 401 quando não recebe token",
      async () => {
        const {
          app,
          buildIndividualAnalysisReport,
          renderPdf,
        } = createTestApp();

        const response =
          await request(app)
            .get(
              "/api/relatorios/analise-individual/7",
            )
            .query({
              start:
                "2026-11-24T00:00:00.000Z",

              end:
                "2026-11-25T00:00:00.000Z",
            });

        expect(
          response.status,
        ).toBe(401);

        expect(
          buildIndividualAnalysisReport,
        ).not.toHaveBeenCalled();

        expect(
          renderPdf,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna 400 para serviceId inválido",
      async () => {
        const {
          app,
          buildIndividualAnalysisReport,
        } = createTestApp();

        const token =
          createToken({
            sub: "1",
          });

        const response =
          await request(app)
            .get(
              "/api/relatorios/analise-individual/abc",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              start:
                "2026-11-24T00:00:00.000Z",

              end:
                "2026-11-25T00:00:00.000Z",
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body.code,
        ).toBe(
          "INVALID_REPORT_SERVICE_ID",
        );

        expect(
          buildIndividualAnalysisReport,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna 400 quando start não é informado",
      async () => {
        const {
          app,
          buildIndividualAnalysisReport,
        } = createTestApp();

        const token =
          createToken({
            sub: "1",
          });

        const response =
          await request(app)
            .get(
              "/api/relatorios/analise-individual/7",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              end:
                "2026-11-25T00:00:00.000Z",
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body.code,
        ).toBe(
          "INVALID_REPORT_PERIOD",
        );

        expect(
          buildIndividualAnalysisReport,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna um PDF para uma solicitação válida",
      async () => {
        const {
          app,
          buildIndividualAnalysisReport,
          renderPdf,
        } = createTestApp();

        const token =
          createToken({
            sub: "1",
          });

        const report =
          createReportData();

        const fakePdf =
          Buffer.from(
            "%PDF-1.4\nPDF DE TESTE\n%%EOF",
            "utf8",
          );

        buildIndividualAnalysisReport
          .mockResolvedValue(
            report,
          );

        renderPdf
          .mockResolvedValue(
            fakePdf,
          );

        const response =
          await request(app)
            .get(
              "/api/relatorios/analise-individual/7",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              start:
                "2026-11-24T00:00:00.000Z",

              end:
                "2026-11-25T00:00:00.000Z",
            });

        expect(
          response.status,
        ).toBe(200);

        expect(
          response.headers[
            "content-type"
          ],
        ).toContain(
          "application/pdf",
        );

        expect(
          response.headers[
            "content-disposition"
          ],
        ).toContain(
          'attachment; filename="greener-relatorio-servico-7.pdf"',
        );

        expect(
          response.headers[
            "cache-control"
          ],
        ).toBe("no-store");

        expect(
          buildIndividualAnalysisReport,
        ).toHaveBeenCalledWith(
          7,
          "2026-11-24T00:00:00.000Z",
          "2026-11-25T00:00:00.000Z",
        );

        expect(
          renderPdf,
        ).toHaveBeenCalledWith(
          report,
        );
      },
    );
  },
);
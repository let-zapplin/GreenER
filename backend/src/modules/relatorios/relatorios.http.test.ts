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

import { errorMiddleware } from "../../shared/middlewares/error.middleware.js";
import { createToken } from "../../shared/utils/jwt.util.js";

import {
  RelatoriosController,
} from "./relatorios.controller.js";

import {
  createRelatoriosRouter,
} from "./relatorios.routes.js";

import type {
  ComparisonAnalysisReportData,
  IndividualAnalysisReportData,
} from "./relatorios.types.js";

/* ======================================================
   DADOS DE TESTE
====================================================== */

const start =
  "2026-11-24T10:00:00.000Z";

const end =
  "2026-11-24T10:10:00.000Z";

function createIndividualReport():
  IndividualAnalysisReportData {
  return {
    generatedAt:
      new Date(
        "2026-11-25T15:00:00.000Z",
      ),

    period: {
      start,
      end,
    },

    service: {
      serviceId: 7,

      name: "Billing API",

      status: "active",

      location: {
        regionCode: "BR-SP",

        country: "Brasil",

        region: "São Paulo",

        city: "São Paulo",
      },
    },

    environmentalSummary: {
      energyKwh: 0.1,

      emissionsGco2e: 10,

      metricCoveragePercent: 100,

      carbonIntensityCoveragePercent:
        100,

      isPartial: false,
    },

    resourceSummary: {
      cpu: {
        averagePercent: 45,
        peakPercent: 70,
      },

      memory: {
        averageGb: 3,
        peakGb: 4,
      },

      disk: {
        averageGb: 18,
        peakGb: 20,
      },

      network: {
        totalGb: 0.8,
      },
    },

    history: [
      {
        attemptedAt:
          "2026-11-24T10:00:00.000Z",

        energyKwh: 0.01,

        emissionsGco2e: 1,

        gapReason: null,
      },
    ],
  };
}

function createComparisonReport():
  ComparisonAnalysisReportData {
  return {
    generatedAt:
      new Date(
        "2026-11-25T15:00:00.000Z",
      ),

    period: {
      start,
      end,
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
        ],
      },

      {
        serviceId: 2,

        name: "Checkout Worker",

        status: "active",

        regionCode: "BR-SP",

        periodValue: 0.2,

        isPartial: false,

        history: [
          {
            attemptedAt:
              "2026-11-24T10:00:00.000Z",

            value: 0.02,

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

      highestValue: 0.2,

      lowestValue: 0.1,

      difference: 0.1,

      isPartial: false,
    },
  };
}

/* ======================================================
   APP DE TESTE
====================================================== */

function createTestContext() {
  const buildIndividualAnalysisReport =
    vi.fn(
      async (
        _serviceId: number,
        _start: string,
        _end: string,
      ) =>
        createIndividualReport(),
    );

  const buildComparisonAnalysisReport =
    vi.fn(
      async (
        _serviceIds: number[],
        _start: string,
        _end: string,
        _metric:
          | "energy"
          | "emissions"
          | "cpu"
          | "memory"
          | "disk"
          | "network",
      ) =>
        createComparisonReport(),
    );

  const individualPdf =
    Buffer.from(
      "%PDF-1.4\nindividual\n%%EOF",
      "latin1",
    );

  const comparisonPdf =
    Buffer.from(
      "%PDF-1.4\ncomparacao\n%%EOF",
      "latin1",
    );

  const renderIndividualPdf =
    vi.fn(
      async (
        _report:
          IndividualAnalysisReportData,
      ) =>
        individualPdf,
    );

  const renderComparisonPdf =
    vi.fn(
      async (
        _report:
          ComparisonAnalysisReportData,
      ) =>
        comparisonPdf,
    );

  const controller =
    new RelatoriosController(
      {
        buildIndividualAnalysisReport,
        buildComparisonAnalysisReport,
      },

      renderIndividualPdf,

      renderComparisonPdf,
    );

  const app =
    express();

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

    individualPdf,
    comparisonPdf,

    buildIndividualAnalysisReport,
    buildComparisonAnalysisReport,

    renderIndividualPdf,
    renderComparisonPdf,
  };
}

function createValidToken(): string {
  return createToken({
    sub: "1",
  });
}

/* ======================================================
   CONFIGURAÇÃO
====================================================== */

beforeEach(() => {
  vi.stubEnv(
    "JWT_SECRET",
    "segredo-exclusivo-relatorios-http-test",
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
   RELATÓRIO INDIVIDUAL
====================================================== */

describe(
  "HTTP do relatório individual",
  () => {
    it(
      "retorna 401 quando não há token",
      async () => {
        const context =
          createTestContext();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/analise-individual/7",
            )
            .query({
              start,
              end,
            });

        expect(
          response.status,
        ).toBe(401);

        expect(
          context
            .buildIndividualAnalysisReport,
        ).not.toHaveBeenCalled();

        expect(
          context.renderIndividualPdf,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna 400 quando o identificador do serviço é inválido",
      async () => {
        const context =
          createTestContext();

        const token =
          createValidToken();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/analise-individual/abc",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              start,
              end,
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
          context
            .buildIndividualAnalysisReport,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna 400 quando o período não é informado",
      async () => {
        const context =
          createTestContext();

        const token =
          createValidToken();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/analise-individual/7",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              end,
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
          context
            .buildIndividualAnalysisReport,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna PDF quando os parâmetros são válidos",
      async () => {
        const context =
          createTestContext();

        const token =
          createValidToken();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/analise-individual/7",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              start,
              end,
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
        ).toBe(
          'attachment; filename="greener-relatorio-servico-7.pdf"',
        );

        expect(
          response.headers[
            "cache-control"
          ],
        ).toBe("no-store");

        expect(
          response.headers[
            "x-content-type-options"
          ],
        ).toBe("nosniff");

        expect(
          Number(
            response.headers[
              "content-length"
            ],
          ),
        ).toBe(
          context.individualPdf
            .length,
        );

        expect(
          context
            .buildIndividualAnalysisReport,
        ).toHaveBeenCalledWith(
          7,
          start,
          end,
        );

        expect(
          context.renderIndividualPdf,
        ).toHaveBeenCalledOnce();

        expect(
          context.renderIndividualPdf,
        ).toHaveBeenCalledWith(
          createIndividualReport(),
        );
      },
    );
  },
);

/* ======================================================
   RELATÓRIO COMPARATIVO
====================================================== */

describe(
  "HTTP do relatório comparativo",
  () => {
    it(
      "retorna 401 quando não há token",
      async () => {
        const context =
          createTestContext();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/comparacao",
            )
            .query({
              serviceIds:
                "1,2,3",

              metric:
                "energy",

              start,
              end,
            });

        expect(
          response.status,
        ).toBe(401);

        expect(
          context
            .buildComparisonAnalysisReport,
        ).not.toHaveBeenCalled();

        expect(
          context.renderComparisonPdf,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna 400 quando serviceIds não é informado",
      async () => {
        const context =
          createTestContext();

        const token =
          createValidToken();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/comparacao",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              metric:
                "energy",

              start,
              end,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body.code,
        ).toBe(
          "INVALID_REPORT_COMPARISON_SERVICES",
        );

        expect(
          context
            .buildComparisonAnalysisReport,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna 400 quando serviceIds contém identificador inválido",
      async () => {
        const context =
          createTestContext();

        const token =
          createValidToken();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/comparacao",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              serviceIds:
                "1,abc,3",

              metric:
                "energy",

              start,
              end,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body.code,
        ).toBe(
          "INVALID_REPORT_COMPARISON_SERVICES",
        );

        expect(
          context
            .buildComparisonAnalysisReport,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna 400 quando a métrica é inválida",
      async () => {
        const context =
          createTestContext();

        const token =
          createValidToken();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/comparacao",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              serviceIds:
                "1,2,3",

              metric:
                "latency",

              start,
              end,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body.code,
        ).toBe(
          "INVALID_REPORT_COMPARISON_METRIC",
        );

        expect(
          context
            .buildComparisonAnalysisReport,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna 400 quando o período não é informado",
      async () => {
        const context =
          createTestContext();

        const token =
          createValidToken();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/comparacao",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              serviceIds:
                "1,2,3",

              metric:
                "energy",

              end,
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
          context
            .buildComparisonAnalysisReport,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "retorna PDF comparativo quando os parâmetros são válidos",
      async () => {
        const context =
          createTestContext();

        const token =
          createValidToken();

        const response =
          await request(
            context.app,
          )
            .get(
              "/api/relatorios/comparacao",
            )
            .set(
              "Authorization",
              `Bearer ${token}`,
            )
            .query({
              serviceIds:
                "1,2,3",

              metric:
                "energy",

              start,
              end,
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
        ).toBe(
          'attachment; filename="greener-relatorio-comparacao-energy.pdf"',
        );

        expect(
          response.headers[
            "cache-control"
          ],
        ).toBe("no-store");

        expect(
          response.headers[
            "x-content-type-options"
          ],
        ).toBe("nosniff");

        expect(
          Number(
            response.headers[
              "content-length"
            ],
          ),
        ).toBe(
          context.comparisonPdf
            .length,
        );

        expect(
          context
            .buildComparisonAnalysisReport,
        ).toHaveBeenCalledWith(
          [1, 2, 3],
          start,
          end,
          "energy",
        );

        expect(
          context.renderComparisonPdf,
        ).toHaveBeenCalledOnce();

        expect(
          context.renderComparisonPdf,
        ).toHaveBeenCalledWith(
          createComparisonReport(),
        );
      },
    );
  },
);

import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/AppError.js";

import {
  renderComparisonAnalysisPdf,
  renderIndividualAnalysisPdf,
} from "./relatorios.pdf.js";

import { RelatoriosService } from "./relatorios.service.js";

import type {
  ComparisonReportMetric,
} from "./relatorios.types.js";

/* ======================================================
   DEPENDÊNCIAS
====================================================== */

type ReportService = Pick<
  RelatoriosService,
  | "buildIndividualAnalysisReport"
  | "buildComparisonAnalysisReport"
>;

type IndividualReportPdfRenderer =
  typeof renderIndividualAnalysisPdf;

type ComparisonReportPdfRenderer =
  typeof renderComparisonAnalysisPdf;

/* ======================================================
   VALIDAÇÃO DE PARÂMETROS
====================================================== */

function readQueryDate(
  value: unknown,
  name: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new AppError(
      `Informe o parâmetro ${name} como uma única data ISO`,
      400,
      "INVALID_REPORT_PERIOD",
    );
  }

  const timestamp =
    Date.parse(value);

  if (
    !Number.isFinite(timestamp)
  ) {
    throw new AppError(
      `Informe o parâmetro ${name} como uma única data ISO`,
      400,
      "INVALID_REPORT_PERIOD",
    );
  }

  return value;
}

function readServiceId(
  value: unknown,
): number {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new AppError(
      "O identificador do serviço deve ser um número inteiro positivo",
      400,
      "INVALID_REPORT_SERVICE_ID",
    );
  }

  const serviceId =
    Number(value);

  if (
    !Number.isInteger(serviceId) ||
    serviceId <= 0
  ) {
    throw new AppError(
      "O identificador do serviço deve ser um número inteiro positivo",
      400,
      "INVALID_REPORT_SERVICE_ID",
    );
  }

  return serviceId;
}

function readComparisonServiceIds(
  value: unknown,
): number[] {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new AppError(
      "Informe os serviços da comparação no parâmetro serviceIds",
      400,
      "INVALID_REPORT_COMPARISON_SERVICES",
    );
  }

  const rawIds =
    value
      .split(",")
      .map(
        (item) =>
          item.trim(),
      );

  if (
    rawIds.some(
      (item) =>
        item === "",
    )
  ) {
    throw new AppError(
      "Os identificadores da comparação devem ser números inteiros positivos separados por vírgula",
      400,
      "INVALID_REPORT_COMPARISON_SERVICES",
    );
  }

  const serviceIds =
    rawIds.map(Number);

  if (
    serviceIds.some(
      (serviceId) =>
        !Number.isInteger(
          serviceId,
        ) ||
        serviceId <= 0,
    )
  ) {
    throw new AppError(
      "Os identificadores da comparação devem ser números inteiros positivos separados por vírgula",
      400,
      "INVALID_REPORT_COMPARISON_SERVICES",
    );
  }

  return serviceIds;
}

const COMPARISON_METRICS =
  [
    "energy",
    "emissions",
    "cpu",
    "memory",
    "disk",
    "network",
  ] as const satisfies readonly ComparisonReportMetric[];

function readComparisonMetric(
  value: unknown,
): ComparisonReportMetric {
  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      "Informe uma métrica válida para o relatório comparativo",
      400,
      "INVALID_REPORT_COMPARISON_METRIC",
    );
  }

  if (
    !COMPARISON_METRICS.includes(
      value as ComparisonReportMetric,
    )
  ) {
    throw new AppError(
      "Informe uma métrica válida para o relatório comparativo",
      400,
      "INVALID_REPORT_COMPARISON_METRIC",
    );
  }

  return value as ComparisonReportMetric;
}

/* ======================================================
   CONTROLLER
====================================================== */

export class RelatoriosController {
  constructor(
    private readonly service:
      ReportService =
        new RelatoriosService(),

    private readonly renderIndividualPdf:
      IndividualReportPdfRenderer =
        renderIndividualAnalysisPdf,

    private readonly renderComparisonPdf:
      ComparisonReportPdfRenderer =
        renderComparisonAnalysisPdf,
  ) {}

  /* ====================================================
     RELATÓRIO INDIVIDUAL
  ==================================================== */

  async individualAnalysis(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const serviceId =
        readServiceId(
          req.params.serviceId,
        );

      const start =
        readQueryDate(
          req.query.start,
          "start",
        );

      const end =
        readQueryDate(
          req.query.end,
          "end",
        );

      const report =
        await this.service
          .buildIndividualAnalysisReport(
            serviceId,
            start,
            end,
          );

      const pdf =
        await this.renderIndividualPdf(
          report,
        );

      const fileName =
        `greener-relatorio-servico-${serviceId}.pdf`;

      res
        .status(200)
        .set({
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Content-Length":
            String(pdf.length),

          "Cache-Control":
            "no-store",

          "X-Content-Type-Options":
            "nosniff",
        })
        .send(pdf);
    } catch (error) {
      next(error);
    }
  }

  /* ====================================================
     RELATÓRIO COMPARATIVO
  ==================================================== */

  async comparisonAnalysis(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const serviceIds =
        readComparisonServiceIds(
          req.query.serviceIds,
        );

      const metric =
        readComparisonMetric(
          req.query.metric,
        );

      const start =
        readQueryDate(
          req.query.start,
          "start",
        );

      const end =
        readQueryDate(
          req.query.end,
          "end",
        );

      const report =
        await this.service
          .buildComparisonAnalysisReport(
            serviceIds,
            start,
            end,
            metric,
          );

      const pdf =
        await this.renderComparisonPdf(
          report,
        );

      const fileName =
        `greener-relatorio-comparacao-${metric}.pdf`;

      res
        .status(200)
        .set({
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Content-Length":
            String(pdf.length),

          "Cache-Control":
            "no-store",

          "X-Content-Type-Options":
            "nosniff",
        })
        .send(pdf);
    } catch (error) {
      next(error);
    }
  }
}

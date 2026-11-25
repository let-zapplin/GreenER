import {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { AppError } from "../../shared/errors/AppError.js";

import { RelatoriosService } from "./relatorios.service.js";
import { renderIndividualAnalysisPdf } from "./relatorios.pdf.js";

type ReportService = Pick<
  RelatoriosService,
  "buildIndividualAnalysisReport"
>;

type ReportPdfRenderer =
  typeof renderIndividualAnalysisPdf;

/*   VALIDAÇÃO DOS PARÂMETROS HTTP
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
  const serviceId = Number(value);

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

/*  CONTROLLER */

export class RelatoriosController {
  constructor(
    private readonly service: ReportService =
      new RelatoriosService(),

    private readonly renderPdf: ReportPdfRenderer =
      renderIndividualAnalysisPdf,
  ) {}

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

      /*
       * O controller não calcula indicadores.
       *
       * Ele apenas solicita ao service os dados
       * necessários para o relatório.
       */
      const report =
        await this.service
          .buildIndividualAnalysisReport(
            serviceId,
            start,
            end,
          );

      /*
       * O renderer também permanece separado.
       *
       * O controller não conhece detalhes de
       * layout, PDFKit ou desenho do documento.
       */
      const pdf =
        await this.renderPdf(
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
}
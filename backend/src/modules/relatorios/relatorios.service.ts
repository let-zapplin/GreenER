import { AppError } from "../../shared/errors/AppError.js";

import { IndicadoresService } from "../indicadores/indicadores.service.js";
import { ServicosService } from "../servicos/servicos.service.js";

import type { IndividualAnalysisReportData } from "./relatorios.types.js";

type ReportIndicatorsService = Pick<
  IndicadoresService,
  "getServicePeriodIndicators" | "getServiceHistory"
>;

type ReportServicesService = Pick<
  ServicosService,
  "listAll"
>;

export class RelatoriosService {
  constructor(
    private readonly indicadoresService: ReportIndicatorsService =
      new IndicadoresService(),

    private readonly servicosService: ReportServicesService =
      new ServicosService(),
  ) {}

  async buildIndividualAnalysisReport(
    serviceId: number,
    start: string,
    end: string,
  ): Promise<IndividualAnalysisReportData> {
    const [indicators, history, services] =
      await Promise.all([
        this.indicadoresService.getServicePeriodIndicators(
          serviceId,
          start,
          end,
        ),

        this.indicadoresService.getServiceHistory(
          serviceId,
          start,
          end,
        ),

        this.servicosService.listAll(),
      ]);

    const service = services.find(
      (item) =>
        item.id_service === serviceId,
    );

    if (!service) {
      throw new AppError(
        "Serviço não encontrado para geração do relatório",
        404,
        "REPORT_SERVICE_NOT_FOUND",
      );
    }

    return {
      generatedAt: new Date(),

      period: {
        start:
          history.period.start.toISOString(),

        end:
          history.period.end.toISOString(),
      },

      service: {
        serviceId:
          service.id_service,

        name:
          service.name,

        status:
          service.status,

        location: {
          regionCode:
            service.region_code,

          country:
            service.country,

          region:
            service.region,

          city:
            service.city,
        },
      },

      environmentalSummary: {
        energyKwh:
          indicators.periodTotals.energyKwh,

        emissionsGco2e:
          indicators.periodTotals.emissionsGco2e,

        metricCoveragePercent:
          indicators.periodTotals.metricCoveragePercent,

        carbonIntensityCoveragePercent:
          indicators.periodTotals
            .carbonIntensityCoveragePercent,

        isPartial:
          indicators.periodTotals.isPartial,
      },

      resourceSummary:
        indicators.resourceSummary,

      history:
        history.samples.map(
          (sample) => ({
            attemptedAt:
              sample.attemptedAt.toISOString(),

            energyKwh:
              sample.energyKwh,

            emissionsGco2e:
              sample.emissionsGco2e,

            gapReason:
              sample.gapReason,
          }),
        ),
    };
  }
}
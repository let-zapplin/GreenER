import { AppError } from "../../shared/errors/AppError.js";

import { IndicadoresService } from "../indicadores/indicadores.service.js";
import { ServicosService } from "../servicos/servicos.service.js";

import type {
  ComparisonAnalysisReportData,
  ComparisonReportMetric,
  IndividualAnalysisReportData,
} from "./relatorios.types.js";

/* ======================================================
   DEPENDÊNCIAS
====================================================== */

type ReportIndicatorsService = Pick<
  IndicadoresService,
  "getServicePeriodIndicators" | "getServiceHistory"
>;

type ReportServicesService = Pick<
  ServicosService,
  "listAll"
>;

type ServicePeriodIndicators = Awaited<
  ReturnType<
    IndicadoresService["getServicePeriodIndicators"]
  >
>;

type ServiceHistory = Awaited<
  ReturnType<
    IndicadoresService["getServiceHistory"]
  >
>;

type ServiceHistorySample =
  ServiceHistory["samples"][number];

/* ======================================================
   MÉTRICAS DA COMPARAÇÃO
====================================================== */

const COMPARISON_METRICS: Record<
  ComparisonReportMetric,
  {
    label: string;
    unit: string;
    periodAggregationLabel: string;
  }
> = {
  energy: {
    label: "Energia",
    unit: "kWh",
    periodAggregationLabel:
      "Total no período",
  },

  emissions: {
    label: "CO2e",
    unit: "gCO2e",
    periodAggregationLabel:
      "Total no período",
  },

  cpu: {
    label: "CPU",
    unit: "%",
    periodAggregationLabel:
      "Média no período",
  },

  memory: {
    label: "Memória",
    unit: "GB",
    periodAggregationLabel:
      "Média no período",
  },

  disk: {
    label: "Disco",
    unit: "GB",
    periodAggregationLabel:
      "Média no período",
  },

  network: {
    label: "Rede",
    unit: "GB",
    periodAggregationLabel:
      "Total no período",
  },
};

function isComparisonReportMetric(
  value: string,
): value is ComparisonReportMetric {
  return value in COMPARISON_METRICS;
}

/* ======================================================
   VALIDAÇÕES
====================================================== */

function validateComparisonServiceIds(
  serviceIds: number[],
): number[] {
  const uniqueServiceIds = [
    ...new Set(serviceIds),
  ];

  if (
    uniqueServiceIds.length !==
      serviceIds.length ||
    uniqueServiceIds.length < 2 ||
    uniqueServiceIds.length > 8 ||
    uniqueServiceIds.some(
      (serviceId) =>
        !Number.isInteger(serviceId) ||
        serviceId <= 0,
    )
  ) {
    throw new AppError(
      "A comparação deve conter entre 2 e 8 serviços válidos e sem duplicação",
      400,
      "INVALID_REPORT_COMPARISON_SERVICES",
    );
  }

  return uniqueServiceIds;
}

function validateComparisonPeriod(
  start: string,
  end: string,
): void {
  const startTimestamp =
    Date.parse(start);

  const endTimestamp =
    Date.parse(end);

  if (
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp) ||
    endTimestamp <= startTimestamp
  ) {
    throw new AppError(
      "O período informado para o relatório comparativo é inválido",
      400,
      "INVALID_REPORT_PERIOD",
    );
  }
}

/* ======================================================
   VALOR CONSOLIDADO DA MÉTRICA
====================================================== */

function getComparisonPeriodValue(
  indicators: ServicePeriodIndicators,
  metric: ComparisonReportMetric,
): number | null {
  switch (metric) {
    case "energy":
      return (
        indicators.periodTotals.energyKwh
      );

    case "emissions":
      return (
        indicators.periodTotals
          .emissionsGco2e
      );

    case "cpu":
      return (
        indicators.resourceSummary.cpu
          .averagePercent
      );

    case "memory":
      return (
        indicators.resourceSummary.memory
          .averageGb
      );

    case "disk":
      return (
        indicators.resourceSummary.disk
          .averageGb
      );

    case "network":
      return (
        indicators.resourceSummary.network
          .totalGb
      );
  }
}

/* ======================================================
   VALOR DE CADA AMOSTRA
====================================================== */

function getComparisonHistoryValue(
  sample: ServiceHistorySample,
  metric: ComparisonReportMetric,
): number | null {
  switch (metric) {
    case "energy":
      return sample.energyKwh;

    case "emissions":
      return sample.emissionsGco2e;

    case "cpu":
      return (
        sample.metrics?.cpuPercent ??
        null
      );

    case "memory":
      return (
        sample.metrics?.memoryGb ??
        null
      );

    case "disk":
      return (
        sample.metrics?.diskGb ??
        null
      );

    case "network":
      return (
        sample.metrics?.networkGb ??
        null
      );
  }
}

/* ======================================================
   HISTÓRICO + GAP TEMPORAL
====================================================== */

function buildComparisonHistory(
  history: ServiceHistory,
  metric: ComparisonReportMetric,
): ComparisonAnalysisReportData["services"][number]["history"] {
  const rawPoints = [
    ...history.samples,
  ]
    .sort(
      (a, b) =>
        a.attemptedAt.getTime() -
        b.attemptedAt.getTime(),
    )
    .map((sample) => ({
      attemptedAt:
        sample.attemptedAt.toISOString(),

      timestampMs:
        sample.attemptedAt.getTime(),

      value:
        getComparisonHistoryValue(
          sample,
          metric,
        ),

      gapReason:
        sample.gapReason,
    }));

  const points:
    ComparisonAnalysisReportData["services"][number]["history"] =
      [];

  /*
   * Mantém a mesma regra usada
   * atualmente no frontend.
   *
   * Se houver mais de 2,5 intervalos
   * sem coleta, inserimos um ponto
   * nulo para quebrar a linha.
   */
  const temporalGapThreshold =
    history.period.displayIntervalMs *
    2.5;

  rawPoints.forEach(
    (point, index) => {
      const previousPoint =
        rawPoints[index - 1];

      if (previousPoint) {
        const elapsed =
          point.timestampMs -
          previousPoint.timestampMs;

        if (
          elapsed >
          temporalGapThreshold
        ) {
          const gapTimestamp =
            previousPoint.timestampMs +
            history.period
              .displayIntervalMs;

          points.push({
            attemptedAt:
              new Date(
                gapTimestamp,
              ).toISOString(),

            value: null,

            gapReason: null,

            temporalGap: true,
          });
        }
      }

      points.push({
        attemptedAt:
          point.attemptedAt,

        value:
          point.value,

        gapReason:
          point.gapReason,

        temporalGap: false,
      });
    },
  );

  return points;
}

/* ======================================================
   SERVICE
====================================================== */

export class RelatoriosService {
  constructor(
    private readonly indicadoresService:
      ReportIndicatorsService =
        new IndicadoresService(),

    private readonly servicosService:
      ReportServicesService =
        new ServicosService(),
  ) {}

  /* ====================================================
     RELATÓRIO INDIVIDUAL
  ==================================================== */

  async buildIndividualAnalysisReport(
    serviceId: number,
    start: string,
    end: string,
  ): Promise<IndividualAnalysisReportData> {
    const [
      indicators,
      history,
      services,
    ] = await Promise.all([
      this.indicadoresService
        .getServicePeriodIndicators(
          serviceId,
          start,
          end,
        ),

      this.indicadoresService
        .getServiceHistory(
          serviceId,
          start,
          end,
        ),

      this.servicosService.listAll(),
    ]);

    const service =
      services.find(
        (item) =>
          item.id_service ===
          serviceId,
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
          history.period.start
            .toISOString(),

        end:
          history.period.end
            .toISOString(),
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
          indicators.periodTotals
            .energyKwh,

        emissionsGco2e:
          indicators.periodTotals
            .emissionsGco2e,

        metricCoveragePercent:
          indicators.periodTotals
            .metricCoveragePercent,

        carbonIntensityCoveragePercent:
          indicators.periodTotals
            .carbonIntensityCoveragePercent,

        isPartial:
          indicators.periodTotals
            .isPartial,
      },

      resourceSummary:
        indicators.resourceSummary,

      history:
        history.samples.map(
          (sample) => ({
            attemptedAt:
              sample.attemptedAt
                .toISOString(),

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

  /* ====================================================
     RELATÓRIO COMPARATIVO
  ==================================================== */

  async buildComparisonAnalysisReport(
    serviceIds: number[],
    start: string,
    end: string,
    metric: ComparisonReportMetric,
  ): Promise<ComparisonAnalysisReportData> {
    const normalizedServiceIds =
      validateComparisonServiceIds(
        serviceIds,
      );

    validateComparisonPeriod(
      start,
      end,
    );

    if (
      !isComparisonReportMetric(
        metric,
      )
    ) {
      throw new AppError(
        "A métrica informada para o relatório comparativo é inválida",
        400,
        "INVALID_REPORT_COMPARISON_METRIC",
      );
    }

    /*
     * O catálogo é usado para recuperar
     * o nome de um serviço mesmo se a
     * consulta dos indicadores falhar.
     */
    const servicesCatalog =
      await this.servicosService
        .listAll();

    const servicesById =
      new Map(
        servicesCatalog.map(
          (service) =>
            [
              service.id_service,
              service,
            ] as const,
        ),
      );

    /*
     * Cada serviço é tratado como uma
     * unidade independente.
     *
     * Uma falha não deve cancelar as
     * consultas dos demais.
     */
    const settledServices =
      await Promise.allSettled(
        normalizedServiceIds.map(
          async (serviceId) => {
            const [
              indicators,
              history,
            ] =
              await Promise.all([
                this.indicadoresService
                  .getServicePeriodIndicators(
                    serviceId,
                    start,
                    end,
                  ),

                this.indicadoresService
                  .getServiceHistory(
                    serviceId,
                    start,
                    end,
                  ),
              ]);

            return {
              serviceId,

              name:
                indicators.name,

              status:
                indicators.status,

              regionCode:
                indicators.regionCode,

              periodValue:
                getComparisonPeriodValue(
                  indicators,
                  metric,
                ),

              isPartial:
                indicators.periodTotals
                  .isPartial,

              history:
                buildComparisonHistory(
                  history,
                  metric,
                ),
            };
          },
        ),
      );

    const services:
      ComparisonAnalysisReportData["services"] =
        [];

    const failedServices:
      ComparisonAnalysisReportData["failedServices"] =
        [];

    settledServices.forEach(
      (result, index) => {
        const serviceId =
          normalizedServiceIds[index];

        if (
          result.status ===
          "fulfilled"
        ) {
          services.push(
            result.value,
          );

          return;
        }

        failedServices.push({
          serviceId,

          name:
            servicesById.get(
              serviceId,
            )?.name ?? null,
        });
      },
    );

    /*
     * Um relatório comparativo só faz
     * sentido se pelo menos dois serviços
     * puderem ser analisados.
     */
    if (
      services.length < 2
    ) {
      throw new AppError(
        "Não há dados suficientes para gerar uma comparação entre pelo menos dois serviços",
        422,
        "REPORT_COMPARISON_INSUFFICIENT_DATA",
      );
    }

    const servicesWithValue =
      services.filter(
        (
          service,
        ): service is typeof service & {
          periodValue: number;
        } =>
          service.periodValue !==
            null &&
          Number.isFinite(
            service.periodValue,
          ),
      );

    /* ==================================================
       MAIOR VALOR
    ================================================== */

    const highestService =
      servicesWithValue.reduce<
        | (typeof servicesWithValue)[number]
        | null
      >(
        (
          highest,
          service,
        ) =>
          highest === null ||
          service.periodValue >
            highest.periodValue
            ? service
            : highest,

        null,
      );

    /* ==================================================
       MENOR VALOR
    ================================================== */

    const lowestService =
      servicesWithValue.reduce<
        | (typeof servicesWithValue)[number]
        | null
      >(
        (
          lowest,
          service,
        ) =>
          lowest === null ||
          service.periodValue <
            lowest.periodValue
            ? service
            : lowest,

        null,
      );

    const metricDefinition =
      COMPARISON_METRICS[
        metric
      ];

    return {
      generatedAt:
        new Date(),

      period: {
        start,
        end,
      },

      metric: {
        value: metric,

        ...metricDefinition,
      },

      services,

      failedServices,

      summary: {
        highestServiceId:
          highestService?.serviceId ??
          null,

        lowestServiceId:
          lowestService?.serviceId ??
          null,

        highestValue:
          highestService?.periodValue ??
          null,

        lowestValue:
          lowestService?.periodValue ??
          null,

        difference:
          highestService !== null &&
          lowestService !== null
            ? highestService
                .periodValue -
              lowestService
                .periodValue
            : null,

        isPartial:
          failedServices.length > 0 ||
          services.some(
            (service) =>
              service.isPartial ||
              service.periodValue ===
                null,
          ),
      },
    };
  }
}
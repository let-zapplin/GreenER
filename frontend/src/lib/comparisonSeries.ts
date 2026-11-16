import type {
  IndicatorSample,
  ServiceIndicatorHistoryResponse,
} from "../types/indicators";

import type {
  ComparisonMetric,
  ComparisonSeries,
} from "../types/comparison";

function getComparisonValue(
  sample: IndicatorSample,
  metric: ComparisonMetric,
): number | null {
  switch (metric) {
    case "energy":
      return sample.energyKwh;

    case "emissions":
      return sample.emissionsGco2e;

    case "cpu":
      return sample.metrics?.cpuPercent ?? null;

    case "memory":
      return sample.metrics?.memoryGb ?? null;

    case "disk":
      return sample.metrics?.diskGb ?? null;

    case "network":
      return sample.metrics?.networkGb ?? null;
  }
}

export function buildComparisonSeries(
  histories: ServiceIndicatorHistoryResponse[],
  metric: ComparisonMetric,
): ComparisonSeries[] {
  return histories.map((history) => {
    // --------------------------------------------------
    // 1. TRANSFORMA AS AMOSTRAS EM PONTOS DO GRÁFICO
    // --------------------------------------------------
    const rawPoints = [...history.samples]
      .sort(
        (a, b) =>
          new Date(a.attemptedAt).getTime() -
          new Date(b.attemptedAt).getTime(),
      )
      .map((sample) => ({
        collectionId: sample.collectionId,
        attemptedAt: sample.attemptedAt,
        timestampMs: new Date(
          sample.attemptedAt,
        ).getTime(),

        value: getComparisonValue(
          sample,
          metric,
        ),

        gapReason: sample.gapReason,
      }));

    // --------------------------------------------------
    // 2. ARRAY FINAL QUE PODE RECEBER GAPS TEMPORAIS
    // --------------------------------------------------
    const points: ComparisonSeries["points"] = [];

    // Se passar mais de 2,5 intervalos sem coleta,
    // consideramos que existe um gap temporal.
    const temporalGapThreshold =
      history.period.displayIntervalMs * 2.5;

    // --------------------------------------------------
    // 3. PERCORRE OS PONTOS E DETECTA BURACOS NO TEMPO
    // --------------------------------------------------
    rawPoints.forEach((point, index) => {
      const previousPoint =
        rawPoints[index - 1];

      if (previousPoint) {
        const elapsed =
          point.timestampMs -
          previousPoint.timestampMs;

        if (elapsed > temporalGapThreshold) {
          const gapTimestamp =
            previousPoint.timestampMs +
            history.period.displayIntervalMs;

          points.push({
            collectionId:
              `temporal-gap-${gapTimestamp}`,

            attemptedAt:
              new Date(
                gapTimestamp,
              ).toISOString(),

            timestampMs: gapTimestamp,

            value: null,

            gapReason: null,

            temporalGap: true,
          });
        }
      }

      // Sempre adicionamos o ponto real depois
      // da eventual marcação de gap.
      points.push(point);
    });

    // --------------------------------------------------
    // 4. DEVOLVE UMA SÉRIE PARA ESTE SERVIÇO
    // --------------------------------------------------
    return {
      serviceId: history.service.serviceId,
      name: history.service.name,
      status: history.service.status,
      regionCode: history.service.regionCode,

      points,
    };
  });
}
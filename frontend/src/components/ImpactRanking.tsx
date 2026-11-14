import type { IndicatorsResponse } from "../types/indicators";
import "./ImpactRanking.css";

type ImpactRankingProps = {
  services: IndicatorsResponse["services"];
  periodLabel: string;
  metric: RankingMetric;
  onMetricChange: (metric: RankingMetric) => void;
};

export type RankingMetric = "energy" | "emissions";

function formatRankingValue(
  value: number,
  metric: RankingMetric,
): string {
  if (metric === "energy") {
    return `${value.toLocaleString("pt-BR", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    })} kWh`;
  }

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} gCO₂e`;
}

function formatServiceStatus(status: string): string {
  switch (status) {
    case "active":
      return "Ativo";

    case "removed":
      return "Removido";

    case "unavailable":
      return "Indisponível";

    case "no_metrics":
      return "Sem métricas";

    default:
      return status;
  }
}

export function ImpactRanking({
  services,
  periodLabel,
   metric,
  onMetricChange,
}: ImpactRankingProps) {


  const getRankingValue = (
    service: IndicatorsResponse["services"][number],
  ) => {
    return metric === "energy"
      ? service.periodTotals.energyKwh
      : service.periodTotals.emissionsGco2e;
  };

  const rankedServices = [...services].sort(
    (a, b) =>
      getRankingValue(b) - getRankingValue(a),
  );

  const maxValue =
    rankedServices.length > 0
      ? getRankingValue(rankedServices[0])
      : 0;

  return (
    <div className="impact-ranking">
      <div className="impact-ranking-header">
        <div>
          <p className="impact-ranking-eyebrow">
            RANKING DE IMPACTO
          </p>

          <p className="impact-ranking-period">
            Período analisado: {periodLabel}
          </p>
        </div>

        <div
          className="impact-ranking-metric-selector"
          aria-label="Métrica do ranking"
        >
          <button
            type="button"
            className={
              metric === "energy"
                ? "impact-ranking-metric-button is-active"
                : "impact-ranking-metric-button"
            }
            aria-pressed={metric === "energy"}
            onClick={() => onMetricChange("energy")}
          >
            Energia
          </button>

          <button
            type="button"
            className={
              metric === "emissions"
                ? "impact-ranking-metric-button is-active"
                : "impact-ranking-metric-button"
            }
            aria-pressed={metric === "emissions"}
            onClick={() => onMetricChange("emissions")}
          >
            CO₂e
          </button>
        </div>
      </div>

      <div className="impact-ranking-list">
        {rankedServices.map((service, index) => {
          const value = getRankingValue(service);

          const percentage =
            maxValue > 0
              ? (value / maxValue) * 100
              : 0;

          return (
            <div
              key={service.serviceId}
              className="impact-ranking-item"
            >
              <div className="impact-ranking-item-header">
                <div className="impact-ranking-service">
                  <span className="impact-ranking-position">
                    {index + 1}
                  </span>

                  <div>
                    <strong>{service.name}</strong>

                    <span className="impact-ranking-region">
                      {service.regionCode}
                    </span>

                    <span className="impact-ranking-status">
                      {formatServiceStatus(
                        service.status,
                      )}
                    </span>
                  </div>
                </div>

                <div className="impact-ranking-value">
                  <strong>
                    {formatRankingValue(
                      value,
                      metric,
                    )}
                  </strong>

                  {service.periodTotals.isPartial && (
                    <span className="impact-ranking-partial">
                      Dados parciais
                    </span>
                  )}
                </div>
              </div>

              <div className="impact-ranking-bar">
                <div
                  className="impact-ranking-bar-fill"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
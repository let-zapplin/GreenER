import {
  Line,
  LineChart,
  ResponsiveContainer,
} from "recharts";

import { useServiceIndicatorHistory } from "../hooks/useServiceIndicatorHistory";

import "./ServiceMiniHistoryChart.css";

type ServiceMiniHistoryChartProps = {
  serviceId: number;
};

const MINI_HISTORY_PERIOD_MS =
  24 * 60 * 60 * 1000;

export function ServiceMiniHistoryChart({
  serviceId,
}: ServiceMiniHistoryChartProps) {
  const {
    history,
    loading,
    error,
  } = useServiceIndicatorHistory(
    serviceId,
    MINI_HISTORY_PERIOD_MS,
  );

  const data =
    history?.samples.map((sample) => ({
      attemptedAt: sample.attemptedAt,
      energyKwh: sample.energyKwh,
    })) ?? [];

  const validSamples = data.filter(
    (sample) =>
      sample.energyKwh !== null,
  );

  return (
    <section
      className="service-mini-history"
      aria-label="Histórico energético das últimas 24 horas"
    >
      <div className="service-mini-history-header">
        <div>
          <span>HISTÓRICO</span>
          <strong>Energia · 24h</strong>
        </div>

        <span className="service-mini-history-unit">
          kWh
        </span>
      </div>

      <div className="service-mini-history-chart">
        {loading && !history ? (
          <div className="service-mini-history-state">
            Carregando histórico...
          </div>
        ) : error && !history ? (
          <div className="service-mini-history-state">
            Histórico indisponível
          </div>
        ) : validSamples.length === 0 ? (
          <div className="service-mini-history-state">
            Sem dados no período
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={data}
              margin={{
                top: 8,
                right: 4,
                bottom: 4,
                left: 4,
              }}
            >
              <Line
                type="monotone"
                dataKey="energyKwh"
                stroke="currentColor"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive
                animationDuration={550}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
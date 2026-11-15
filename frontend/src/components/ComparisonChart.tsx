import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ComparisonMetric, ComparisonSeries } from "../types/comparison";

import {
  formatComparisonValue,
  getComparisonMetricDefinition,
} from "../lib/comparisonMetrics";

import "./ComparisonChart.css";

type ComparisonChartProps = {
  series: ComparisonSeries[];

  metric: ComparisonMetric;

  periodStart: string;
  periodEnd: string;

  focusServiceId: number | null;

  onFocusServiceChange: (serviceId: number) => void;
};

const SERIES_COLORS = [
  "#8BFF5D", // verde-limão
  "#36D9FF", // azul-ciano
  "#FFB347", // laranja
  "#FF66D8", // magenta
];

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ComparisonChart({
  series,
  metric,
  periodStart,
  periodEnd,
  focusServiceId,
  onFocusServiceChange,
}: ComparisonChartProps) {
  const metricDefinition = getComparisonMetricDefinition(metric);

  const startTimestamp = new Date(periodStart).getTime();

  const endTimestamp = new Date(periodEnd).getTime();

  const focusedSeries =
    series.find(
      (serviceSeries) => serviceSeries.serviceId === focusServiceId,
    ) ??
    series[0] ??
    null;

  const secondarySeries = series.filter(
    (serviceSeries) => serviceSeries.serviceId !== focusServiceId,
  );

  function getSeriesOpacity(serviceId: number): number {
    if (serviceId === focusServiceId) {
      return 1;
    }

    const secondaryIndex = secondarySeries.findIndex(
      (serviceSeries) => serviceSeries.serviceId === serviceId,
    );

    const opacityLevels = [0.7, 0.5, 0.3];

    return opacityLevels[secondaryIndex] ?? 0.3;
  }

  function getSeriesStrokeWidth(serviceId: number): number {
    if (serviceId === focusServiceId) {
      return 3.4;
    }

    const secondaryIndex = secondarySeries.findIndex(
      (serviceSeries) => serviceSeries.serviceId === serviceId,
    );

    const strokeWidths = [2.5, 2, 1.7];

    return strokeWidths[secondaryIndex] ?? 1.7;
  }

  const orderedSeries = [...series].sort((a, b) => {
    if (a.serviceId === focusServiceId) {
      return 1;
    }

    if (b.serviceId === focusServiceId) {
      return -1;
    }

    return 0;
  });

  return (
    <section
      className="comparison-chart"
      aria-labelledby="comparison-chart-title"
    >
      <div className="comparison-chart-header">
        <div>
          <p className="analyses-section-label">COMPARAÇÃO TEMPORAL</p>

          <h2 id="comparison-chart-title">
            {metricDefinition.label} dos serviços
          </h2>

          <p>
            Compare a evolução dos serviços selecionados usando a mesma janela
            temporal.
          </p>
        </div>

        <div className="comparison-chart-header-meta">
          {focusedSeries && (
            <div className="comparison-chart-focus">
              <span>Em destaque</span>

              <strong>{focusedSeries.name}</strong>
            </div>
          )}

          <span className="comparison-chart-unit">{metricDefinition.unit}</span>
        </div>
      </div>

      <div
        className="comparison-chart-canvas"
        role="img"
        aria-label={`Comparação de ${metricDefinition.label} entre os serviços selecionados`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            margin={{
              top: 16,
              right: 20,
              bottom: 8,
              left: 8,
            }}
          >
            <CartesianGrid
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="4 4"
              vertical={false}
            />

            <XAxis
              dataKey="timestampMs"
              type="number"
              scale="time"
              domain={[startTimestamp, endTimestamp]}
              allowDataOverflow
              tickFormatter={(value) => formatTime(Number(value))}
              tickCount={7}
              minTickGap={40}
              tickLine={false}
              axisLine={{
                stroke: "rgba(255, 255, 255, 0.16)",
              }}
              tick={{
                fill: "#9fb6ad",
                fontSize: 12,
              }}
            />

            <YAxis
              width={78}
              tickFormatter={(value: number) =>
                formatComparisonValue(value, metric)
              }
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#9fb6ad",
                fontSize: 12,
              }}
            />

            <Tooltip
              filterNull={false}
              labelFormatter={(value) => formatDateTime(Number(value))}
              formatter={(value, name) => [
                `${formatComparisonValue(
                  Number(value),
                  metric,
                )} ${metricDefinition.unit}`,
                String(name),
              ]}
              contentStyle={{
                background: "#0c2d30f2",
                border: "1px solid #426c60",
                borderRadius: "12px",
              }}
            />

            {orderedSeries.map((serviceSeries) => {
              const originalIndex = series.findIndex(
                (item) => item.serviceId === serviceSeries.serviceId,
              );

              const isFocused = serviceSeries.serviceId === focusServiceId;

              return (
                <Line
                  key={serviceSeries.serviceId}
                  data={serviceSeries.points}
                  dataKey="value"
                  name={serviceSeries.name}
                  type="monotone"
                  stroke={SERIES_COLORS[originalIndex % SERIES_COLORS.length]}
                  strokeWidth={getSeriesStrokeWidth(serviceSeries.serviceId)}
                  strokeOpacity={getSeriesOpacity(serviceSeries.serviceId)}
                  strokeLinecap="round"
                  dot={false}
                  activeDot={{
                    r: isFocused ? 5 : 3,
                    strokeWidth: 2,
                    fill: "#12383b",
                  }}
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={320}
                  animationEasing="ease-out"
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="comparison-chart-footer">
        <span>Tempo</span>

        <span>
          {metricDefinition.label} · {metricDefinition.unit}
        </span>
      </div>

      <div className="comparison-chart-legend">
        <div className="comparison-chart-legend-header">
          <span>Serviço em destaque</span>

          <small>
            Selecione um serviço para enfatizar sua série no gráfico.
          </small>
        </div>

        <div className="comparison-chart-legend-options">
          {series.map((serviceSeries, index) => {
            const isFocused = serviceSeries.serviceId === focusServiceId;

            return (
              <button
                key={serviceSeries.serviceId}
                type="button"
                className={
                  isFocused
                    ? "comparison-chart-legend-item is-focused"
                    : "comparison-chart-legend-item"
                }
                aria-pressed={isFocused}
                onClick={() => onFocusServiceChange(serviceSeries.serviceId)}
              >
                <span
                  className="comparison-chart-legend-line"
                  style={{
                    background: SERIES_COLORS[index % SERIES_COLORS.length],
                  }}
                />

                <span>{serviceSeries.name}</span>

                <small>{serviceSeries.regionCode}</small>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

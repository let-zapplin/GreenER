import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ServiceIndicators } from "../types/indicators";
import type { ComparisonMetric } from "../types/comparison";

import {
  formatComparisonValue,
  getComparisonMetricDefinition,
  getComparisonPeriodValue,
} from "../lib/comparisonMetrics";
import {
  getComparisonServiceColor,
  getComparisonServiceOpacity,
} from "../lib/comparisonVisual";

import "./ComparisonPeriodChart.css";

type ComparisonPeriodChartData = {
  serviceId: number;
  name: string;
  value: number | null;
  isPartial: boolean;
};

type ComparisonPeriodChartProps = {
  services: ServiceIndicators[];

  selectedServiceIds: number[];

  metric: ComparisonMetric;

  focusServiceId: number | null;

  onFocusServiceChange: (serviceId: number) => void;
};

export function ComparisonPeriodChart({
  services,
  selectedServiceIds,
  metric,
  focusServiceId,
  onFocusServiceChange,
}: ComparisonPeriodChartProps) {
  const metricDefinition = getComparisonMetricDefinition(metric);

  const chartData: ComparisonPeriodChartData[] = services.map((service) => ({
    serviceId: service.serviceId,
    name: service.name,

    value: getComparisonPeriodValue(service, metric),

    isPartial: service.periodTotals.isPartial,
  }));

  const secondaryServiceIds = selectedServiceIds.filter(
    (serviceId) => serviceId !== focusServiceId,
  );

  return (
    <section className="comparison-period-chart">
      <div className="comparison-period-chart-header">
        <div>
          <p className="analyses-section-label">COMPARAÇÃO DO PERÍODO</p>

          <h2>{metricDefinition.label} por serviço</h2>

          <p>
            {metricDefinition.periodAggregationLabel} para os serviços
            selecionados.
          </p>
        </div>

        <span className="comparison-chart-unit">{metricDefinition.unit}</span>
      </div>

      <div className="comparison-period-chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 8,
              right: 32,
              bottom: 8,
              left: 16,
            }}
          >
            <CartesianGrid
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="4 4"
              horizontal={false}
            />

            <XAxis
              type="number"
              tickFormatter={(value) =>
                formatComparisonValue(Number(value), metric)
              }
              tickLine={false}
              axisLine={{
                stroke: "rgba(255,255,255,0.16)",
              }}
              tick={{
                fill: "#9fb6ad",
                fontSize: 12,
              }}
            />

            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#f4f8f5",
                fontSize: 12,
              }}
            />

            <Tooltip
              formatter={(value) => [
                `${formatComparisonValue(Number(value), metric)} ${metricDefinition.unit}`,
                metricDefinition.label,
              ]}
              contentStyle={{
                background: "#0c2d30f2",
                border: "1px solid #426c60",
                borderRadius: "12px",
                color: "#f4f8f5",
              }}
              labelStyle={{
                color: "#f4f8f5",
                fontWeight: 700,
              }}
              itemStyle={{
                color: "#d8ece5",
                fontWeight: 600,
              }}
              cursor={{
                fill: "rgba(255,255,255,0.08)",
              }}
            />
            <Bar
              dataKey="value"
              radius={[0, 8, 8, 0]}
              maxBarSize={34}
              isAnimationActive
              animationDuration={320}
              animationEasing="ease-out"
              onClick={(entry) => {
                const serviceId = entry.payload?.serviceId;

                if (typeof serviceId === "number") {
                  onFocusServiceChange(serviceId);
                }
              }}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.serviceId}
                  fill={getComparisonServiceColor(
                    entry.serviceId,
                    selectedServiceIds,
                  )}
                  fillOpacity={getComparisonServiceOpacity(
                    entry.serviceId,
                    selectedServiceIds,
                    focusServiceId,
                  )}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="comparison-period-chart-note">
        Clique em uma barra para destacar o serviço na comparação.
      </div>
    </section>
  );
}

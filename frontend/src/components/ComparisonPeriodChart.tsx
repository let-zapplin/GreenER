import { useChartTouch } from "../hooks/useChartTouch";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Text,
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
  const isTouch = useChartTouch();
  const [isCompact, setIsCompact] = useState(false);
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
        <ResponsiveContainer
          width="100%"
          height="100%"
          onResize={(width: number) => setIsCompact(width < 420)}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 8,
              right: isCompact ? 12 : 32,
              bottom: 8,
              left: isCompact ? 0 : 16,
            }}
          >
            <CartesianGrid
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="4 4"
              horizontal={false}
            />

            <XAxis
              type="number"
              tickCount={isCompact ? 3 : 5}
              minTickGap={isCompact ? 12 : 5}
              tickFormatter={(value) =>
                isCompact
                  ? Number(value).toLocaleString("pt-BR", {
                      maximumSignificantDigits: 3,
                      notation: Number(value) !== 0 && Math.abs(Number(value)) < 0.001
                        ? "scientific" : "compact",
                    })
                  : formatComparisonValue(Number(value), metric)
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
              width={isCompact ? 88 : 160}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={isCompact
                ? ({ y, payload }: { y?: string | number; payload?: { value?: string | number } }) => (
                    <Text
                      x={0}
                      y={y}
                      width={80}
                      textAnchor="start"
                      verticalAnchor="middle"
                      fill="#f4f8f5"
                      fontSize={11}
                      breakAll
                    >
                      {String(payload?.value ?? "")}
                    </Text>
                  )
                : { fill: "#f4f8f5", fontSize: 12 }}
            />

            <Tooltip
              trigger={isTouch ? "click" : "hover"}
              formatter={(value) => [
                `${formatComparisonValue(Number(value), metric)} ${metricDefinition.unit}`,
                metricDefinition.label,
              ]}
              contentStyle={{
                maxWidth: "100%",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
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

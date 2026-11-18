import { useState } from "react";
import { useChartTouch } from "../hooks/useChartTouch";
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

import type {
  LocationProjectionScenario,
} from "../types/projection";

import "./LocationProjectionChart.css";

type LocationProjectionChartProps = {
  scenarios: LocationProjectionScenario[];
};

type ProjectionChartData = {
  regionCode: string;
  name: string;
  value: number | null;
  isCurrent: boolean;
};

function formatValue(
  value: number,
): string {
  if (value < 1) {
    return value.toFixed(4);
  }

  return value.toFixed(2);
}

export function LocationProjectionChart({
  scenarios,
}: LocationProjectionChartProps) {
  const [isCompact, setIsCompact] = useState(false);
  const isTouch = useChartTouch();
  const chartData: ProjectionChartData[] =
    scenarios.map((scenario) => ({
      regionCode: scenario.regionCode,

      name: scenario.region,

      value:
        scenario.projectedEmissionsGco2e,

      isCurrent: scenario.isCurrent,
    }));

  return (
    <section className="location-projection-chart">
      <div className="location-projection-chart-header">
        <div>
          <p className="analyses-section-label">
            COMPARAÇÃO VISUAL
          </p>

          <h2>
            CO₂e projetado por região
          </h2>

          <p>
            Quanto menor a barra, menor a emissão
            estimada para o mesmo consumo energético.
          </p>
        </div>

        <span>gCO₂e</span>
      </div>

      <div
        className="location-projection-chart-canvas"
        style={{ height: Math.max(isCompact ? 260 : 320, scenarios.length * 60 + 48) }}
        role="img"
        aria-label="Comparativo de emissões projetadas por região, em gramas de CO₂e"
      >
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
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 4"
              horizontal={false}
            />

            <XAxis
              type="number"
              tickCount={isCompact ? 3 : 5}
              minTickGap={12}
              tickFormatter={(value) =>
                isCompact
                  ? Number(value).toLocaleString("pt-BR", {
                      maximumSignificantDigits: 3,
                      notation: Number(value) !== 0 && Math.abs(Number(value)) < 0.001 ? "scientific" : "compact",
                    })
                  : formatValue(Number(value))
              }
              tickLine={false}
              axisLine={{
                stroke:
                  "rgba(255,255,255,0.16)",
              }}
              tick={{
                fill: "#9fb6ad",
                fontSize: 12,
              }}
            />

            <YAxis
              type="category"
              dataKey="name"
              width={isCompact ? 88 : 150}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={isCompact
                ? ({ y, payload }: { y?: string | number; payload?: { value?: string | number } }) => (
                    <Text x={0} y={y} width={80} textAnchor="start" verticalAnchor="middle" fill="#f4f8f5" fontSize={11} breakAll>
                      {String(payload?.value ?? "")}
                    </Text>
                  )
                : { fill: "#f4f8f5", fontSize: 12 }}
            />

            <Tooltip
              trigger={isTouch ? "click" : "hover"}
              formatter={(value) => [
                `${formatValue(Number(value))} gCO₂e`,
                "Emissão projetada",
              ]}
              contentStyle={{
                maxWidth: "100%",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                background: "#0c2d30f2",
                border:
                  "1px solid #426c60",
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
                fill:
                  "rgba(255,255,255,0.06)",
              }}
            />

            <Bar
              dataKey="value"
              radius={[0, 8, 8, 0]}
              maxBarSize={36}
              isAnimationActive
              animationDuration={350}
              animationEasing="ease-out"
            >
              {chartData.map(
                (entry) => (
                  <Cell
                    key={
                      entry.regionCode
                    }
                    fill={
                      entry.isCurrent
                        ? "#58cbb7"
                        : "#8bff5d"
                    }
                    fillOpacity={
                      entry.isCurrent
                        ? 0.72
                        : 0.9
                    }
                  />
                ),
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="location-projection-chart-legend">
        <span>
          <i className="is-current" />
          Localização atual
        </span>

        <span>
          <i className="is-projected" />
          Localidades projetadas
        </span>
      </div>
    </section>
  );
}
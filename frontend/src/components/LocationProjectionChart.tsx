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

      <div className="location-projection-chart-canvas">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
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
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 4"
              horizontal={false}
            />

            <XAxis
              type="number"
              tickFormatter={(value) =>
                formatValue(Number(value))
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
              width={150}
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#f4f8f5",
                fontSize: 12,
              }}
            />

            <Tooltip
              formatter={(value) => [
                `${formatValue(Number(value))} gCO₂e`,
                "Emissão projetada",
              ]}
              contentStyle={{
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
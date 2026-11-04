import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { IndicatorSample } from "../types/indicators";

import "./HistoryChart.css";

type HistoryChartProps = {
  samples: IndicatorSample[];
};

type ChartPoint = {
  attemptedAt: string;
  energyKwh: number | null;
};

function formatEnergy(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryChart({
  samples,
}: HistoryChartProps) {
  const data: ChartPoint[] = samples.map((sample) => ({
    attemptedAt: sample.attemptedAt,
    energyKwh: sample.energyKwh,
  }));

  return (
    <div className="history-chart">
      <div
        className="history-chart-canvas"
        role="img"
        aria-label="Gráfico da evolução do consumo energético estimado nas últimas 24 horas"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 12,
              right: 18,
              bottom: 8,
              left: 4,
            }}
          >
            <CartesianGrid
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="4 4"
              vertical={false}
            />

            <XAxis
              dataKey="attemptedAt"
              tickFormatter={formatTime}
              minTickGap={48}
              tickLine={false}
              axisLine={{
                stroke: "rgba(255, 255, 255, 0.16)",
              }}
              tick={{
                fill: "#9fb6ad",
                fontSize: 11,
              }}
            />

            <YAxis
              width={72}
              tickFormatter={(value: number) =>
                formatEnergy(value)
              }
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#9fb6ad",
                fontSize: 11,
              }}
            />

            <Tooltip
              labelFormatter={(value) =>
                formatDateTime(String(value))
              }
              formatter={(value) => {
                if (
                  typeof value !== "number" ||
                  !Number.isFinite(value)
                ) {
                  return ["Indisponível", "Energia"];
                }

                return [
                  `${formatEnergy(value)} kWh`,
                  "Energia",
                ];
              }}
              contentStyle={{
                background: "#0c2d30",
                border: "1px solid #315657",
                borderRadius: "10px",
                color: "#f4f8f5",
              }}
              labelStyle={{
                color: "#9fb6ad",
                marginBottom: "6px",
              }}
            />

            <Line
              type="monotone"
              dataKey="energyKwh"
              name="Energia"
              stroke="#87e46c"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 2,
                fill: "#12383b",
              }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="history-chart-footer">
        <span>
          Tempo
        </span>

        <span>
          Energia estimada por coleta · kWh
        </span>
      </div>
    </div>
  );
}
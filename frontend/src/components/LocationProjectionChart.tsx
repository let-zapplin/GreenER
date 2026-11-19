import { useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartTouch } from "../hooks/useChartTouch";

import type {
  LocationProjectionScenario,
} from "../types/projection";

import "./LocationProjectionChart.css";

type LocationProjectionChartProps = {
  scenarios: LocationProjectionScenario[];
};

type ProjectionScenarioKind =
  | "current"
  | "best"
  | "worst"
  | "projected";

type ProjectionChartData = {
  regionCode: string;

  name: string;

  country: string;

  value: number | null;

  differencePercent: number | null;

  kind: ProjectionScenarioKind;
};

type AxisTickProps = {
  x?: number | string;

  y?: number | string;

  payload?: {
    value?: string;
  };
};

function formatValue(
  value: number,
): string {
  if (value < 1) {
    return value.toFixed(4);
  }

  return value.toFixed(2);
}

function formatCompactValue(
  value: number,
): string {
  return value.toLocaleString(
    "pt-BR",
    {
      maximumSignificantDigits: 3,

      notation:
        value !== 0 &&
        Math.abs(value) < 0.001
          ? "scientific"
          : "compact",
    },
  );
}

function getBarColor(
  kind: ProjectionScenarioKind,
): string {
  switch (kind) {
    case "current":
      return "#58cbb7";

    case "best":
      return "#8bff5d";

    case "worst":
      return "#ff967d";

    default:
      return "#87a8a1";
  }
}

function getScenarioLabel(
  kind: ProjectionScenarioKind,
): string {
  switch (kind) {
    case "current":
      return "Atual";

    case "best":
      return "★ Melhor";

    case "worst":
      return "↑ Maior impacto";

    default:
      return "Projeção";
  }
}

export function LocationProjectionChart({
  scenarios,
}: LocationProjectionChartProps) {
  const [isCompact, setIsCompact] =
    useState(false);

  const isTouch =
    useChartTouch();

  /*
   * Consideramos melhor/pior apenas entre
   * as localidades projetadas.
   *
   * A localização atual continua separada
   * como referência da projeção.
   */
  const projectedScenarios =
    scenarios
      .filter(
        (scenario) =>
          !scenario.isCurrent &&
          scenario.projectedEmissionsGco2e !==
            null,
      )
      .sort(
        (first, second) =>
          first.projectedEmissionsGco2e! -
          second.projectedEmissionsGco2e!,
      );

  const bestScenario =
    projectedScenarios.length >= 2
      ? projectedScenarios[0]
      : null;

  const worstScenario =
    projectedScenarios.length >= 2
      ? projectedScenarios[
          projectedScenarios.length - 1
        ]
      : null;

  const currentScenario =
    scenarios.find(
      (scenario) =>
        scenario.isCurrent &&
        scenario.projectedEmissionsGco2e !==
          null,
    ) ?? null;

  const currentEmission =
    currentScenario
      ?.projectedEmissionsGco2e ??
    null;

  /*
   * Monta os dados do gráfico e identifica
   * o papel visual de cada cenário.
   */
  const chartData: ProjectionChartData[] =
    scenarios
      .map((scenario) => {
        let kind: ProjectionScenarioKind =
          "projected";

        if (scenario.isCurrent) {
          kind = "current";
        } else if (
          scenario.regionCode ===
          bestScenario?.regionCode
        ) {
          kind = "best";
        } else if (
          scenario.regionCode ===
          worstScenario?.regionCode
        ) {
          kind = "worst";
        }

        return {
          regionCode:
            scenario.regionCode,

          name:
            scenario.region,

          country:
            scenario.country,

          value:
            scenario.projectedEmissionsGco2e,

          differencePercent:
            scenario.differencePercent,

          kind,
        };
      })
      .sort(
        (
          first,
          second,
        ) => {
          if (
            first.value === null &&
            second.value === null
          ) {
            return 0;
          }

          if (
            first.value === null
          ) {
            return 1;
          }

          if (
            second.value === null
          ) {
            return -1;
          }

          return (
            first.value -
            second.value
          );
        },
      );

  /*
   * Tick customizado:
   *
   * BR-SP
   * Atual
   *
   * CA-QC
   * ★ Melhor
   */
  function renderXAxisTick({
    x = 0,
    y = 0,
    payload,
  }: AxisTickProps) {
    const regionCode =
      payload?.value;

    const entry =
      chartData.find(
        (item) =>
          item.regionCode ===
          regionCode,
      );

    if (!entry) {
      return null;
    }

    const label =
      getScenarioLabel(
        entry.kind,
      );

    return (
      <g
        transform={`translate(${Number(
          x,
        )}, ${Number(y)})`}
      >
        <text
          x={0}
          y={0}
          dy={14}
          textAnchor="middle"
          fill="#dce9e4"
          fontSize={
            isCompact
              ? 9
              : 11
          }
          fontWeight={700}
        >
          {entry.regionCode}
        </text>

        <text
          x={0}
          y={0}
          dy={30}
          textAnchor="middle"
          fill={getBarColor(
            entry.kind,
          )}
          fontSize={
            isCompact
              ? 8
              : 9
          }
          fontWeight={700}
        >
          {label}
        </text>
      </g>
    );
  }

  return (
    <section className="location-projection-chart">
      <div className="location-projection-chart-header">
        <div>
          <p className="analyses-section-label">
            COMPARAÇÃO DE IMPACTO
          </p>

          <h2>
            CO₂e projetado por região
          </h2>

          <p>
            Os cenários estão ordenados do menor
            para o maior impacto ambiental estimado.
          </p>
        </div>

        <span>
          gCO₂e
        </span>
      </div>

      <div
        className="location-projection-chart-canvas"
        role="img"
        aria-label="Comparativo de emissões projetadas por região, em gramas de CO₂e"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          onResize={(
            width: number,
          ) =>
            setIsCompact(
              width < 420,
            )
          }
        >
          <BarChart
            data={chartData}
            margin={{
              top: 26,

              right:
                isCompact
                  ? 8
                  : 20,

              bottom: 34,

              left:
                isCompact
                  ? 0
                  : 4,
            }}
            barCategoryGap="24%"
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.07)"
              strokeDasharray="4 4"
              vertical={false}
            />

            <XAxis
              type="category"
              dataKey="regionCode"
              tick={
                renderXAxisTick
              }
              tickLine={false}
              axisLine={{
                stroke:
                  "rgba(255,255,255,0.14)",
              }}
              interval={0}
              height={46}
            />

            <YAxis
              type="number"
              tickFormatter={(
                value,
              ) =>
                isCompact
                  ? formatCompactValue(
                      Number(
                        value,
                      ),
                    )
                  : formatValue(
                      Number(
                        value,
                      ),
                    )
              }
              tickLine={false}
              axisLine={false}
              width={
                isCompact
                  ? 48
                  : 58
              }
              tick={{
                fill:
                  "#9fb6ad",

                fontSize:
                  isCompact
                    ? 9
                    : 10,
              }}
            />

            {currentEmission !==
              null && (
              <ReferenceLine
                y={
                  currentEmission
                }
                stroke="#58cbb7"
                strokeWidth={
                  1.5
                }
                strokeDasharray="5 5"
                label={{
                  value:
                    "Impacto atual",

                  position:
                    "insideTopRight",

                  fill:
                    "#58cbb7",

                  fontSize:
                    isCompact
                      ? 9
                      : 10,
                }}
              />
            )}

            <Tooltip
              trigger={
                isTouch
                  ? "click"
                  : "hover"
              }
              labelFormatter={(
                regionCode,
              ) => {
                const entry =
                  chartData.find(
                    (item) =>
                      item.regionCode ===
                      regionCode,
                  );

                if (!entry) {
                  return regionCode;
                }

                return `${entry.name} · ${entry.country}`;
              }}
              formatter={(
                value,
              ) => [
                `${formatValue(
                  Number(value),
                )} gCO₂e`,

                "Emissão projetada",
              ]}
              contentStyle={{
                maxWidth:
                  "100%",

                whiteSpace:
                  "normal",

                overflowWrap:
                  "anywhere",

                background:
                  "#0c2d30f2",

                border:
                  "1px solid #426c60",

                borderRadius:
                  "12px",

                color:
                  "#f4f8f5",
              }}
              labelStyle={{
                color:
                  "#f4f8f5",

                fontWeight:
                  700,
              }}
              itemStyle={{
                color:
                  "#d8ece5",

                fontWeight:
                  600,
              }}
              cursor={{
                fill:
                  "rgba(255,255,255,0.05)",
              }}
            />

            <Bar
              dataKey="value"
              radius={[
                7,
                7,
                2,
                2,
              ]}
              maxBarSize={
                isCompact
                  ? 36
                  : 44
              }
              isAnimationActive
              animationDuration={
                380
              }
              animationEasing="ease-out"
            >
              {chartData.map(
                (entry) => (
                  <Cell
                    key={
                      entry.regionCode
                    }
                    fill={getBarColor(
                      entry.kind,
                    )}
                    fillOpacity={
                      entry.kind ===
                      "projected"
                        ? 0.68
                        : 0.92
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
          <i className="is-best" />

          Melhor projeção
        </span>

        <span>
          <i className="is-current" />

          Localização atual
        </span>

        <span>
          <i className="is-projected" />

          Outras projeções
        </span>

        <span>
          <i className="is-worst" />

          Maior impacto
        </span>
      </div>
    </section>
  );
}
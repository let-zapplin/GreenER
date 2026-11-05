import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MouseHandlerDataParam, TooltipContentProps } from "recharts";
import type { IndicatorSample } from "../types/indicators";
import { useState } from "react";
import "./HistoryChart.css";

type HistoryChartProps = {
  samples: IndicatorSample[];
  periodStart: string;
  periodEnd: string;
  collectionIntervalMs: number;
  displayIntervalMs: number;
};

type ChartPoint = {
  attemptedAt: string;
  timestamp: number;
  energyKwh: number | null;
  gapReason: IndicatorSample["gapReason"];
  temporalGap?: boolean;
};

function formatEnergy(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

function formatTime(value: number): string {
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

function formatGapReason(reason: IndicatorSample["gapReason"]): string {
  switch (reason) {
    case "unavailable":
      return "Serviço indisponível durante a coleta";

    case "no_metrics":
      return "O serviço não forneceu métricas";

    case "invalid_metrics":
      return "As métricas recebidas eram inválidas";

    case "collection_interval_unavailable":
      return "Intervalo da coleta indisponível";

    case "carbon_intensity_unavailable":
      return "Intensidade de carbono indisponível";

    case "error":
      return "Ocorreu um erro durante a coleta";

    default:
      return "Não foi possível calcular a energia desta coleta";
  }
}

function HistoryTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload as ChartPoint | undefined;

  if (!point) {
    return null;
  }

  return (
    <div className="history-chart-tooltip">
      <time>{formatDateTime(point.attemptedAt)}</time>

      {point.energyKwh !== null ? (
        <>
          <span>Energia estimada</span>

          <strong>{formatEnergy(point.energyKwh)} kWh</strong>
        </>
      ) : point.temporalGap ? (
        <>
          <span>Monitoramento interrompido</span>

          <strong className="history-chart-tooltip-gap">
            Sem coleta registrada
          </strong>

          <p>Não houve coleta neste intervalo do histórico.</p>
        </>
      ) : (
        <>
          <span>Energia indisponível</span>

          <strong className="history-chart-tooltip-gap">
            Sem valor calculável
          </strong>

          <p>{formatGapReason(point.gapReason)}</p>
        </>
      )}
    </div>
  );
}

export function HistoryChart({
  samples,
  periodStart,
  periodEnd,
  collectionIntervalMs,
  displayIntervalMs,
}: HistoryChartProps) {
  const startTimestamp = new Date(periodStart).getTime();
  const endTimestamp = new Date(periodEnd).getTime();

  const rawData: ChartPoint[] = samples.map((sample) => ({
    attemptedAt: sample.attemptedAt,
    timestamp: new Date(sample.attemptedAt).getTime(),
    energyKwh: sample.energyKwh,
    gapReason: sample.gapReason,
  }));

  const data: ChartPoint[] = [];

  const temporalGapThreshold = displayIntervalMs * 2.5;

  rawData.forEach((point, index) => {
    const previousPoint = rawData[index - 1];

    if (previousPoint) {
      const elapsed = point.timestamp - previousPoint.timestamp;

      if (elapsed > temporalGapThreshold) {
        data.push({
          attemptedAt: new Date(
            previousPoint.timestamp + displayIntervalMs,
          ).toISOString(),

          timestamp: previousPoint.timestamp + displayIntervalMs,
          energyKwh: null,
          gapReason: null,
          temporalGap: true,
        });
      }
    }

    data.push(point);
  });

  const [zoomStart, setZoomStart] = useState<number | null>(null);

  const [zoomEnd, setZoomEnd] = useState<number | null>(null);

  const [zoomHistory, setZoomHistory] = useState<
    Array<{
      start: number | null;
      end: number | null;
    }>
  >([]);

  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  const isZoomed = zoomStart !== null && zoomEnd !== null;

  const visibleData = isZoomed
    ? data.filter(
        (point) => point.timestamp >= zoomStart && point.timestamp <= zoomEnd,
      )
    : data;

  const visibleStart = zoomStart ?? startTimestamp;

  const visibleEnd = zoomEnd ?? endTimestamp;

  function handleMouseDown(event: MouseHandlerDataParam) {
    const value = Number(event.activeLabel);

    if (!Number.isFinite(value)) {
      return;
    }

    setSelectionStart(value);
    setSelectionEnd(null);
  }

  function handleMouseMove(event: MouseHandlerDataParam) {
    if (selectionStart === null) {
      return;
    }

    const value = Number(event.activeLabel);

    if (!Number.isFinite(value)) {
      return;
    }

    setSelectionEnd(value);
  }

  function handleMouseUp() {
    if (
      selectionStart === null ||
      selectionEnd === null ||
      selectionStart === selectionEnd
    ) {
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const start = Math.min(selectionStart, selectionEnd);

    const end = Math.max(selectionStart, selectionEnd);

    setZoomHistory((history) => [
      ...history,
      {
        start: zoomStart,
        end: zoomEnd,
      },
    ]);

    setZoomStart(start);
    setZoomEnd(end);

    setSelectionStart(null);
    setSelectionEnd(null);
  }

  function goBackZoom() {
    const previousZoom = zoomHistory[zoomHistory.length - 1];

    if (!previousZoom) {
      return;
    }

    setZoomStart(previousZoom.start);
    setZoomEnd(previousZoom.end);

    setZoomHistory((history) => history.slice(0, -1));

    setSelectionStart(null);
    setSelectionEnd(null);
  }

  function resetZoom() {
    setZoomStart(null);
    setZoomEnd(null);
    setZoomHistory([]);
    setSelectionStart(null);
    setSelectionEnd(null);
  }

  return (
    <div className="history-chart">
      <div className="history-chart-toolbar">
        <span>
          {isZoomed
            ? "Intervalo ampliado"
            : "Arraste sobre o gráfico para ampliar"}
        </span>

        {isZoomed && (
          <div className="history-chart-zoom-actions">
            {zoomHistory.length > 0 && (
              <button type="button" onClick={goBackZoom}>
                ← Voltar
              </button>
            )}

            <button
              type="button"
              className="history-chart-reset-button"
              onClick={resetZoom}
            >
              Restaurar
            </button>
          </div>
        )}
      </div>
      <div
        className="history-chart-canvas"
        role="img"
        aria-label="Gráfico da evolução do consumo energético estimado no período selecionado"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visibleData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
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
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={[visibleStart, visibleEnd]}
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
              width={72}
              tickFormatter={(value: number) => formatEnergy(value)}
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#9fb6ad",
                fontSize: 12,
              }}
            />

            <Tooltip
              content={HistoryTooltip}
              filterNull={false}
              allowEscapeViewBox={{
                x: true,
                y: true,
              }}
              cursor={{
                stroke: "rgba(135, 228, 108, 0.32)",
                strokeWidth: 1,
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
            {selectionStart !== null && selectionEnd !== null && (
              <ReferenceArea
                x1={selectionStart}
                x2={selectionEnd}
                stroke="rgba(135, 228, 108, 0.8)"
                fill="rgba(135, 228, 108, 0.12)"
                strokeOpacity={0.8}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="history-chart-footer">
        <span>Tempo</span>

        <span>Energia estimada por coleta · kWh</span>
      </div>
      <div className="history-chart-legend">
        <div>
          <span className="history-chart-legend-line" />
          <span>Energia estimada</span>
        </div>

        <div>
          <span className="history-chart-legend-gap" />
          <span> Ausência de coleta ou energia não calculável</span>
        </div>
      </div>
    </div>
  );
}

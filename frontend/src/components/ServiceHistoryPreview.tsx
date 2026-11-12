import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { useServiceIndicatorHistory } from "../hooks/useServiceIndicatorHistory";
import type { AnalysisPeriodWindow } from "../services/analysisPeriod";

import "./ServiceHistoryPreview.css";

type ServiceHistoryPreviewProps = {
  serviceId: number;
  name: string;
  regionCode: string;
  period: AnalysisPeriodWindow;
  isSelected: boolean;
  onSelect: () => void;
};

function formatEnergy(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

export function ServiceHistoryPreview({
  serviceId,
  name,
  regionCode,
  period,
  isSelected,
  onSelect,
}: ServiceHistoryPreviewProps) {
  const {
    history,
    loading,
    error,
  } = useServiceIndicatorHistory(
    serviceId,
    period,
  );

  const chartData =
    history?.samples.map((sample) => ({
      timestamp: new Date(
        sample.attemptedAt,
      ).getTime(),
      energyKwh: sample.energyKwh,
    })) ?? [];

  const validSamples =
    history?.samples.filter(
      (sample) =>
        sample.energyKwh !== null,
    ) ?? [];

  const latestEnergy =
    validSamples.length > 0
      ? validSamples[
          validSamples.length - 1
        ].energyKwh
      : null;

  return (
    <button
      type="button"
      data-service-id={serviceId}
      className={
        isSelected
          ? "service-history-preview is-selected"
          : "service-history-preview"
      }
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="service-history-preview-header">
        <div>
          <strong>{name}</strong>
          <span>{regionCode}</span>
        </div>

        <div className="service-history-preview-value">
          {latestEnergy !== null ? (
            <>
              <strong>
                {formatEnergy(
                  latestEnergy,
                )}
              </strong>
              <span>kWh</span>
            </>
          ) : (
            <span>Sem energia</span>
          )}
        </div>
      </div>

      <div className="service-history-preview-chart">
        {loading && !history && (
          <div className="service-history-preview-loading" />
        )}

        {error && !history && (
          <div className="service-history-preview-empty">
            Histórico indisponível
          </div>
        )}

        {history &&
          history.samples.length ===
            0 && (
            <div className="service-history-preview-empty">
              Sem coletas no período
            </div>
          )}

        {history &&
          history.samples.length >
            0 &&
          validSamples.length ===
            0 && (
            <div className="service-history-preview-empty">
              Energia indisponível
            </div>
          )}

        {history &&
          validSamples.length > 0 && (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
              >
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={[
                    "dataMin",
                    "dataMax",
                  ]}
                  hide
                />

                <YAxis
                  hide
                  domain={[
                    "auto",
                    "auto",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="energyKwh"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={450}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
      </div>

      <div className="service-history-preview-footer">
        <span>
          {history?.samples.length ??
            0}{" "}
          coletas
        </span>

        <span className="service-history-preview-action">
          Ver detalhes →
        </span>
      </div>
    </button>
  );
}
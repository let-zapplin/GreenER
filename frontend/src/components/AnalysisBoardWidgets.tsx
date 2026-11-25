/*
 * Blocos do painel de monitoramento que reaproveitam os
 * gráficos e resumos da tela Análises. Cada um se vira com os
 * próprios controles, para caber em qualquer tamanho de célula.
 */

import { useMemo, useState, type ReactNode } from "react";

import { ComparisonChart } from "./ComparisonChart";
import { ComparisonPeriodChart } from "./ComparisonPeriodChart";
import { HistoryChart } from "./HistoryChart";
import { ImpactRanking, type RankingMetric } from "./ImpactRanking";
import { LocationProjectionChart } from "./LocationProjectionChart";
import { LocationProjectionMap } from "./LocationProjectionMap";
import { LocationProjectionSummary } from "./LocationProjectionSummary";
import { ProjectionServiceCard } from "./ProjectionServiceCard";

import { useComparisonHistories } from "../hooks/useComparisonHistories";
import { useLocationProjection } from "../hooks/useLocationProjection";
import { useProjectionRegions } from "../hooks/useProjectionRegions";
import { useServiceIndicatorHistory } from "../hooks/useServiceIndicatorHistory";
import { COMPARISON_METRICS } from "../lib/comparisonMetrics";
import { buildComparisonSeries } from "../lib/comparisonSeries";
import {
  MAX_COMPARISON_SERVICES,
  MIN_COMPARISON_SERVICES,
} from "../lib/comparisonLimits";
import { formatServicePlace } from "../lib/serviceLocation";

import type {
  AnalysisPeriodOption,
  AnalysisPeriodWindow,
} from "../services/analysisPeriod";
import type {
  ComparisonMetric,
  ComparisonVisualization,
} from "../types/comparison";
import type { IndicatorsResponse } from "../types/indicators";
import type { MonitoredService } from "../types/service";

import "./AnalysisBoardWidgets.css";

const MAX_PROJECTION_REGIONS = 4;

/** Período compartilhado pelos blocos da página de monitoramento. */
export type AnalysisPeriodControl = {
  periods: readonly AnalysisPeriodOption[];
  durationMs: number;
  onSelectPeriod: (durationMs: number) => void;
};

function PeriodSelect({ control }: { control: AnalysisPeriodControl }) {
  return (
    <select
      className="analysis-widget-select"
      aria-label="Período da análise"
      value={control.durationMs}
      onChange={(event) => control.onSelectPeriod(Number(event.target.value))}
    >
      {control.periods.map((period) => (
        <option key={period.value} value={period.value}>
          {period.label}
        </option>
      ))}
    </select>
  );
}

function WidgetState({
  title,
  children,
  error = false,
}: {
  title: string;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={
        error ? "analysis-widget-state is-error" : "analysis-widget-state"
      }
      role={error ? "alert" : "status"}
    >
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

function usePlaces(services: readonly MonitoredService[]) {
  return useMemo(() => {
    const places: Record<number, string> = {};

    for (const service of services) {
      places[service.serviceId] = formatServicePlace(service.location);
    }

    return places;
  }, [services]);
}

// ---------- ranking ----------

type AnalysisRankingWidgetProps = {
  services: MonitoredService[];
  indicators: IndicatorsResponse | null;
  loading: boolean;
  error: string | null;
  periodLabel: string;
  periodControl: AnalysisPeriodControl;
};

export function AnalysisRankingWidget({
  services,
  indicators,
  loading,
  error,
  periodLabel,
  periodControl,
}: AnalysisRankingWidgetProps) {
  const [metric, setMetric] = useState<RankingMetric>("energy");
  const places = usePlaces(services);
  const rows = indicators?.services ?? [];

  return (
    <div className="analysis-widget">
      <div className="analysis-widget-bar">
        <span className="analysis-widget-eyebrow">RANKING</span>
        <PeriodSelect control={periodControl} />
      </div>

      <div className="analysis-widget-scroll">
        {rows.length > 0 ? (
          <>
            <ImpactRanking
              services={rows}
              places={places}
              periodLabel={periodLabel}
              metric={metric}
              onMetricChange={setMetric}
            />

            {error && (
              <p className="analysis-widget-note">
                Não foi possível atualizar o ranking. Os últimos dados
                carregados permanecem visíveis.
              </p>
            )}
          </>
        ) : loading ? (
          <WidgetState title="Carregando ranking">
            Calculando o impacto dos serviços no período.
          </WidgetState>
        ) : error ? (
          <WidgetState title="Ranking indisponível" error>
            {error}
          </WidgetState>
        ) : (
          <WidgetState title="Sem dados no período">
            Nenhum serviço possui consumo calculado neste período.
          </WidgetState>
        )}
      </div>
    </div>
  );
}

// ---------- histórico do serviço ----------

type AnalysisHistoryWidgetProps = {
  services: MonitoredService[];
  period: AnalysisPeriodWindow;
  periodControl: AnalysisPeriodControl;
};

export function AnalysisHistoryWidget({
  services,
  period,
  periodControl,
}: AnalysisHistoryWidgetProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const activeId = services.some((service) => service.serviceId === selectedId)
    ? selectedId
    : (services[0]?.serviceId ?? null);

  const { history, loading, error } = useServiceIndicatorHistory(
    activeId,
    period,
  );

  const validEnergySamples =
    history?.samples.filter((sample) => sample.energyKwh !== null).length ?? 0;

  return (
    <div className="analysis-widget">
      <div className="analysis-widget-bar">
        <select
          className="analysis-widget-select is-grow"
          aria-label="Serviço do histórico"
          value={activeId ?? ""}
          disabled={services.length === 0}
          onChange={(event) => setSelectedId(Number(event.target.value))}
        >
          {services.map((service) => (
            <option key={service.serviceId} value={service.serviceId}>
              {service.name}
            </option>
          ))}
        </select>

        <PeriodSelect control={periodControl} />
      </div>

      <div className="analysis-widget-scroll">
        {activeId === null ? (
          <WidgetState title="Nenhum serviço monitorado">
            O histórico aparece quando houver serviços cadastrados.
          </WidgetState>
        ) : loading && !history ? (
          <WidgetState title="Carregando histórico">
            Consultando as coletas do serviço no período.
          </WidgetState>
        ) : error && !history ? (
          <WidgetState title="Histórico indisponível" error>
            {error}
          </WidgetState>
        ) : history ? (
          <>
            <dl className="analyses-history-summary analysis-widget-summary">
              <div>
                <dt>Coletas no período</dt>
                <dd>{history.samples.length}</dd>
              </div>

              <div>
                <dt>Com energia calculada</dt>
                <dd>{validEnergySamples}</dd>
              </div>

              <div>
                <dt>Período</dt>
                <dd>
                  {new Date(history.period.start).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" — "}
                  {new Date(history.period.end).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>

            {history.samples.length === 0 ? (
              <WidgetState title="Sem histórico neste período">
                Ainda não existem coletas registradas para este serviço.
              </WidgetState>
            ) : validEnergySamples === 0 ? (
              <WidgetState title="Energia ainda indisponível">
                Existem coletas, mas nenhuma possui dados suficientes para
                calcular o consumo energético.
              </WidgetState>
            ) : (
              <HistoryChart
                key={`${history.service.serviceId}-${history.period.start}-${history.period.end}`}
                samples={history.samples}
                periodStart={history.period.start}
                periodEnd={history.period.end}
                collectionIntervalMs={history.period.collectionIntervalMs}
                displayIntervalMs={history.period.displayIntervalMs}
              />
            )}

            {error && history && (
              <p className="analysis-widget-note">
                Não foi possível atualizar o histórico. Os últimos dados
                permanecem visíveis.
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ---------- comparação de serviços ----------

type AnalysisComparisonWidgetProps = {
  services: MonitoredService[];
  indicators: IndicatorsResponse | null;
  indicatorsLoading: boolean;
  period: AnalysisPeriodWindow;
  periodControl: AnalysisPeriodControl;
};

export function AnalysisComparisonWidget({
  services,
  indicators,
  indicatorsLoading,
  period,
  periodControl,
}: AnalysisComparisonWidgetProps) {
  const [selection, setSelection] = useState<number[] | null>(null);
  const [metric, setMetric] = useState<ComparisonMetric>("energy");

  const [visualization, setVisualization] =
    useState<ComparisonVisualization>("timeline");

  const [focusServiceId, setFocusServiceId] = useState<number | null>(null);

  const defaultIds = useMemo(
    () =>
      services
        .slice(0, MIN_COMPARISON_SERVICES)
        .map((service) => service.serviceId),
    [services],
  );

  // Identidade estável: os hooks de comparação dependem do array.
  const selectedIds = useMemo(
    () =>
      (selection ?? defaultIds).filter((serviceId) =>
        services.some((service) => service.serviceId === serviceId),
      ),
    [selection, defaultIds, services],
  );

  const canCompare = selectedIds.length >= MIN_COMPARISON_SERVICES;

  const limitReached = selectedIds.length >= MAX_COMPARISON_SERVICES;

  const { histories, loading, error } = useComparisonHistories(
    selectedIds,
    period,
    canCompare,
  );

  const series = buildComparisonSeries(histories, metric);

  const comparisonIndicators =
    indicators?.services.filter((service) =>
      selectedIds.includes(service.serviceId),
    ) ?? [];

  function toggleService(serviceId: number) {
    setSelection((current) => {
      const base = current ?? defaultIds;

      if (base.includes(serviceId)) {
        return base.filter((id) => id !== serviceId);
      }

      if (base.length >= MAX_COMPARISON_SERVICES) {
        return base;
      }

      return [...base, serviceId];
    });
  }

  return (
    <div className="analysis-widget">
      <div className="analysis-widget-bar">
        <span className="analysis-widget-eyebrow">COMPARAÇÃO</span>
        <PeriodSelect control={periodControl} />
      </div>

      <div className="analysis-widget-scroll">
        <div
          className="analysis-widget-chips"
          role="group"
          aria-label="Serviços comparados"
        >
          {services.map((service) => {
            const isActive = selectedIds.includes(service.serviceId);

            return (
              <button
                key={service.serviceId}
                type="button"
                className={
                  isActive
                    ? "analysis-widget-chip is-active"
                    : "analysis-widget-chip"
                }
                aria-pressed={isActive}
                disabled={!isActive && limitReached}
                onClick={() => toggleService(service.serviceId)}
              >
                {service.name}
              </button>
            );
          })}
        </div>

        <div className="analysis-widget-controls">
          <select
            className="analysis-widget-select"
            aria-label="Métrica da comparação"
            value={metric}
            onChange={(event) =>
              setMetric(event.target.value as ComparisonMetric)
            }
          >
            {COMPARISON_METRICS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div
            className="analysis-widget-segment"
            role="group"
            aria-label="Visualização da comparação"
          >
            <button
              type="button"
              className={visualization === "timeline" ? "is-active" : ""}
              aria-pressed={visualization === "timeline"}
              onClick={() => setVisualization("timeline")}
            >
              Evolução
            </button>

            <button
              type="button"
              className={visualization === "period" ? "is-active" : ""}
              aria-pressed={visualization === "period"}
              onClick={() => setVisualization("period")}
            >
              Período
            </button>
          </div>
        </div>

        {!canCompare ? (
          <WidgetState title="Selecione pelo menos 2 serviços">
            A comparação fica disponível com 2 a {MAX_COMPARISON_SERVICES}{" "}
            serviços selecionados.
          </WidgetState>
        ) : error ? (
          <WidgetState title="Comparação indisponível" error>
            {error}
          </WidgetState>
        ) : visualization === "timeline" ? (
          series.length > 0 ? (
            <ComparisonChart
              series={series}
              metric={metric}
              periodStart={period.start}
              periodEnd={period.end}
              focusServiceId={focusServiceId}
              onFocusServiceChange={setFocusServiceId}
            />
          ) : loading ? (
            <WidgetState title="Carregando comparação">
              Consultando os históricos dos serviços selecionados.
            </WidgetState>
          ) : null
        ) : comparisonIndicators.length > 0 ? (
          <ComparisonPeriodChart
            services={comparisonIndicators}
            selectedServiceIds={selectedIds}
            metric={metric}
            focusServiceId={focusServiceId}
            onFocusServiceChange={setFocusServiceId}
          />
        ) : indicatorsLoading ? (
          <WidgetState title="Carregando comparação">
            Preparando os indicadores consolidados do período.
          </WidgetState>
        ) : null}
      </div>
    </div>
  );
}

// ---------- projeção de localização ----------

type AnalysisProjectionWidgetProps = {
  services: MonitoredService[];
  period: AnalysisPeriodWindow;
  periodControl: AnalysisPeriodControl;
};

export function AnalysisProjectionWidget({
  services,
  period,
  periodControl,
}: AnalysisProjectionWidgetProps) {
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [regionCodes, setRegionCodes] = useState<string[]>([]);

  const activeServiceId = services.some(
    (service) => service.serviceId === serviceId,
  )
    ? serviceId
    : (services[0]?.serviceId ?? null);

  const activeService =
    services.find((service) => service.serviceId === activeServiceId) ?? null;

  const currentRegionCode = activeService?.location.region_code ?? null;

  const {
    regions,
    loading: regionsLoading,
    error: regionsError,
  } = useProjectionRegions(true);

  const {
    projection,
    loading: projectionLoading,
    error: projectionError,
  } = useLocationProjection(
    activeServiceId,
    period,
    regionCodes,
    regionCodes.length > 0,
  );

  function changeService(nextId: number) {
    setServiceId(nextId);
    setRegionCodes([]);
  }

  function toggleRegion(regionCode: string) {
    setRegionCodes((current) => {
      if (current.includes(regionCode)) {
        return current.filter((code) => code !== regionCode);
      }

      if (current.length >= MAX_PROJECTION_REGIONS) {
        return current;
      }

      return [...current, regionCode];
    });
  }

  return (
    <div className="analysis-widget analysis-projection-widget">
      <div className="analysis-widget-bar">
        <PeriodSelect control={periodControl} />
      </div>

      <div className="analysis-widget-scroll">
        {regionsError ? (
          <p className="analysis-widget-note is-error">{regionsError}</p>
        ) : regionsLoading ? (
          <p className="analysis-widget-note">Carregando localidades…</p>
        ) : null}

        <div className="analysis-widget-projection-primary">
          <ProjectionServiceCard
            service={activeService}
            services={services}
            selectedServiceId={activeServiceId}
            energyKwh={projection?.energyKwh ?? null}
            isPartial={projection?.isPartial ?? false}
            regions={regions}
            selectedRegionCodes={regionCodes}
            currentRegionCode={currentRegionCode}
            onChangeService={changeService}
            onToggleRegion={toggleRegion}
          />

          <LocationProjectionMap
            service={activeService}
            regions={regions}
            selectedRegionCodes={regionCodes}
            onToggleRegion={toggleRegion}
          />
        </div>

        {regionCodes.length === 0 ? (
          <WidgetState title="Selecione uma localidade">
            Os cenários mantêm o consumo energético do serviço e variam apenas o
            fator ambiental da região.
          </WidgetState>
        ) : projectionLoading ? (
          <WidgetState title="Calculando projeção">
            Comparando o consumo observado com os fatores ambientais escolhidos.
          </WidgetState>
        ) : projectionError ? (
          <WidgetState title="Projeção indisponível" error>
            {projectionError}
          </WidgetState>
        ) : projection ? (
          <>
            <LocationProjectionSummary projection={projection} />

            <LocationProjectionChart scenarios={projection.scenarios} />
          </>
        ) : null}
      </div>
    </div>
  );
}

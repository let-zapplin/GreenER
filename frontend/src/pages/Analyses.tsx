import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HistoryChart } from "../components/HistoryChart";
import { useMonitoring } from "../hooks/useMonitoring";
import { useServiceIndicatorHistory } from "../hooks/useServiceIndicatorHistory";
import { ServiceHistoryPreview } from "../components/ServiceHistoryPreview";
import { useAnalysisPeriod } from "../hooks/useAnalysisPeriod";
import { useServiceIndicators } from "../hooks/useServiceIndicators";
import { ImpactRanking, type RankingMetric } from "../components/ImpactRanking";
import "./Analyses.css";

type AnalysisLayout = "focus" | "overview" | "side";
type OverviewView = "charts" | "ranking";

const ANALYSES_LAYOUT_STORAGE_KEY = "greener:analyses:layout";

const ANALYSES_OVERVIEW_STORAGE_KEY = "greener:analyses:overview-collapsed";

function getServiceInitials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

export function Analyses() {
  const [searchParams] = useSearchParams();

  const requestedServiceIdParam = searchParams.get("serviceId");

  const requestedServiceId =
    requestedServiceIdParam !== null &&
    Number.isInteger(Number(requestedServiceIdParam))
      ? Number(requestedServiceIdParam)
      : null;

  const appliedQueryServiceRef = useRef<number | null>(null);
  const {
    snapshot,
    loading: servicesLoading,
    error: servicesError,
  } = useMonitoring();

  const { services } = snapshot;

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null,
  );

  const {
    periods: analysisPeriods,
    durationMs: historyPeriodMs,
    period: analysisPeriod,
    selectPeriod,
  } = useAnalysisPeriod();

  const {
    indicators: serviceIndicators,
    loading: indicatorsLoading,
    error: indicatorsError,
  } = useServiceIndicators(analysisPeriod);

  const analysisPeriodLabel =
    analysisPeriods.find((period) => period.value === historyPeriodMs)?.label ??
    "Período atual";

  const indicatorsPeriodDurationMs = serviceIndicators
    ? new Date(serviceIndicators.period.end).getTime() -
      new Date(serviceIndicators.period.start).getTime()
    : null;

  const visibleServiceIndicators =
    indicatorsPeriodDurationMs !== null &&
    Math.abs(indicatorsPeriodDurationMs - historyPeriodMs) < 1000
      ? serviceIndicators
      : null;

  const [overviewView, setOverviewView] = useState<OverviewView>("charts");

  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("energy");

  const [analysisLayout, setAnalysisLayout] = useState<AnalysisLayout>(() => {
    const savedLayout = localStorage.getItem(ANALYSES_LAYOUT_STORAGE_KEY);

    if (
      savedLayout === "focus" ||
      savedLayout === "overview" ||
      savedLayout === "side"
    ) {
      return savedLayout;
    }

    return "focus";
  });

  const overviewScrollRef = useRef<HTMLDivElement | null>(null);

  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(() => {
    return localStorage.getItem(ANALYSES_OVERVIEW_STORAGE_KEY) === "true";
  });

  const [isChartTransitioning, setIsChartTransitioning] = useState(false);

  useEffect(() => {
    if (services.length === 0) {
      setSelectedServiceId(null);
      return;
    }

    const requestedServiceExists =
      requestedServiceId !== null &&
      services.some((service) => service.serviceId === requestedServiceId);

    if (
      requestedServiceExists &&
      appliedQueryServiceRef.current !== requestedServiceId
    ) {
      appliedQueryServiceRef.current = requestedServiceId;

      setSelectedServiceId(requestedServiceId);

      return;
    }

    setSelectedServiceId((currentServiceId) => {
      const currentServiceStillExists =
        currentServiceId !== null &&
        services.some((service) => service.serviceId === currentServiceId);

      if (currentServiceStillExists) {
        return currentServiceId;
      }

      return services[0].serviceId;
    });
  }, [services, requestedServiceId]);
  useEffect(() => {
    if (selectedServiceId === null) {
      return;
    }

    setIsChartTransitioning(true);

    const timeoutId = window.setTimeout(() => {
      setIsChartTransitioning(false);
    }, 750);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedServiceId, historyPeriodMs]);

  useEffect(() => {
    if (
      analysisLayout !== "side" ||
      isOverviewCollapsed ||
      selectedServiceId === null
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const container = overviewScrollRef.current;

      if (!container) {
        return;
      }

      const selectedCard = container.querySelector<HTMLElement>(
        `[data-service-id="${selectedServiceId}"]`,
      );

      if (!selectedCard) {
        return;
      }

      const containerRect = container.getBoundingClientRect();

      const cardRect = selectedCard.getBoundingClientRect();

      const cardTopInsideContainer =
        cardRect.top - containerRect.top + container.scrollTop;

      const targetTop =
        cardTopInsideContainer -
        container.clientHeight / 2 +
        cardRect.height / 2;

      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedServiceId, analysisLayout, isOverviewCollapsed]);

  useEffect(() => {
    localStorage.setItem(ANALYSES_LAYOUT_STORAGE_KEY, analysisLayout);
  }, [analysisLayout]);

  useEffect(() => {
    localStorage.setItem(
      ANALYSES_OVERVIEW_STORAGE_KEY,
      String(isOverviewCollapsed),
    );
  }, [isOverviewCollapsed]);

  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ?? null;

  const selectedServiceIndex = services.findIndex(
    (service) => service.serviceId === selectedServiceId,
  );

  function selectPreviousService() {
    if (services.length === 0 || selectedServiceIndex < 0) {
      return;
    }

    const previousIndex =
      selectedServiceIndex === 0
        ? services.length - 1
        : selectedServiceIndex - 1;

    setSelectedServiceId(services[previousIndex].serviceId);
  }

  function selectNextService() {
    if (services.length === 0 || selectedServiceIndex < 0) {
      return;
    }

    const nextIndex =
      selectedServiceIndex === services.length - 1
        ? 0
        : selectedServiceIndex + 1;

    setSelectedServiceId(services[nextIndex].serviceId);
  }

  const {
    history,
    loading: historyLoading,
    error: historyError,
  } = useServiceIndicatorHistory(selectedServiceId, analysisPeriod);

  const [previousHistory, setPreviousHistory] = useState<typeof history>(null);

  useEffect(() => {
    if (history) {
      setPreviousHistory(history);
    }
  }, [history]);

  const visibleHistory = history ?? (historyLoading ? previousHistory : null);

  const validEnergySamples =
    visibleHistory?.samples.filter((sample) => sample.energyKwh !== null)
      .length ?? 0;

  return (
    <div className="analyses-screen">
      <main className="analyses-page">
        <header className="analyses-header">
          <p className="analyses-eyebrow">ANÁLISE TEMPORAL</p>

          <h1>
            Histórico <span>ambiental.</span>
          </h1>

          <p className="analyses-description">
            Acompanhe como o impacto ambiental dos serviços evolui ao longo do
            tempo a partir das coletas realizadas pelo GreenER.
          </p>
        </header>

        <section
          className="analyses-controls analyses-global-controls"
          aria-labelledby="analysis-period-title"
        >
          <div>
            <p className="analyses-section-label">JANELA DE ANÁLISE</p>

            <h2 id="analysis-period-title">Período analisado</h2>

            <p className="analyses-control-description">
              O período selecionado é aplicado a todos os históricos exibidos na
              página.
            </p>
          </div>

          <div className="analyses-global-actions">
            <div className="analyses-control-group">
              <span>Período</span>

              <div
                className="analyses-period-options"
                aria-label="Período analisado"
              >
                {analysisPeriods.map((period) => {
                  const isActive = historyPeriodMs === period.value;

                  return (
                    <button
                      key={period.label}
                      type="button"
                      className={
                        isActive
                          ? "analyses-period-button is-active"
                          : "analyses-period-button"
                      }
                      aria-pressed={isActive}
                      onClick={() => selectPeriod(period.value)}
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="analyses-control-group">
              <span>Layout</span>

              <div
                className="analyses-layout-options"
                aria-label="Layout da análise"
              >
                <button
                  type="button"
                  className={
                    analysisLayout === "focus"
                      ? "analyses-layout-button is-active"
                      : "analyses-layout-button"
                  }
                  onClick={() => setAnalysisLayout("focus")}
                >
                  Foco
                </button>

                <button
                  type="button"
                  className={
                    analysisLayout === "overview"
                      ? "analyses-layout-button is-active"
                      : "analyses-layout-button"
                  }
                  onClick={() => setAnalysisLayout("overview")}
                >
                  Geral
                </button>

                <button
                  type="button"
                  className={
                    analysisLayout === "side"
                      ? "analyses-layout-button is-active"
                      : "analyses-layout-button"
                  }
                  onClick={() => setAnalysisLayout("side")}
                >
                  Lateral
                </button>
              </div>
            </div>
          </div>
        </section>

        {servicesLoading && services.length === 0 && (
          <section className="analyses-state" role="status">
            <span className="analyses-loader" aria-hidden="true" />
            <h2>Buscando serviços</h2>
            <p>Estamos carregando os serviços disponíveis para análise.</p>
          </section>
        )}

        {servicesError && services.length === 0 && (
          <section className="analyses-state analyses-state-error" role="alert">
            <h2>Não foi possível carregar os serviços</h2>
            <p>{servicesError}</p>
          </section>
        )}

        {!servicesLoading && !servicesError && services.length === 0 && (
          <section className="analyses-state" role="status">
            <h2>Nenhum serviço disponível</h2>
            <p>
              O histórico poderá ser analisado assim que serviços forem
              identificados pelo GreenER.
            </p>
          </section>
        )}
        <div className={`analyses-layout analyses-layout-${analysisLayout}`}>
          {services.length > 0 && (
            <section
              className="analyses-overview"
              aria-labelledby="analyses-overview-title"
            >
              <div className="analyses-overview-header">
                <div>
                  <p className="analyses-section-label">VISÃO GERAL</p>

                  <h2 id="analyses-overview-title">Visão geral dos serviços</h2>

                  {!isOverviewCollapsed && (
                    <p>
                      Explore a evolução e o impacto ambiental dos serviços no
                      período selecionado
                    </p>
                  )}
                </div>

                <div className="analyses-overview-actions">
                  {overviewView === "charts" && (
                    <span className="analyses-overview-unit">kWh</span>
                  )}

                  <button
                    type="button"
                    className="analyses-overview-toggle"
                    onClick={() =>
                      setIsOverviewCollapsed((current) => !current)
                    }
                    aria-expanded={!isOverviewCollapsed}
                    aria-controls="analyses-overview-content"
                    title={
                      isOverviewCollapsed
                        ? "Expandir visão geral"
                        : "Minimizar visão geral"
                    }
                  >
                    <span aria-hidden="true">
                      {isOverviewCollapsed ? "+" : "−"}
                    </span>
                  </button>
                </div>
              </div>

              {!isOverviewCollapsed && (
                <div className="analyses-overview-toolbar">
                  <div
                    className="analyses-overview-view-options"
                    aria-label="Visualização da visão geral"
                  >
                    <button
                      type="button"
                      className={
                        overviewView === "charts"
                          ? "analyses-overview-view-button is-active"
                          : "analyses-overview-view-button"
                      }
                      aria-pressed={overviewView === "charts"}
                      onClick={() => setOverviewView("charts")}
                    >
                      Gráficos
                    </button>

                    <button
                      type="button"
                      className={
                        overviewView === "ranking"
                          ? "analyses-overview-view-button is-active"
                          : "analyses-overview-view-button"
                      }
                      aria-pressed={overviewView === "ranking"}
                      onClick={() => setOverviewView("ranking")}
                    >
                      Ranking
                    </button>
                  </div>
                </div>
              )}

              {!isOverviewCollapsed && overviewView === "charts" && (
                <div
                  ref={overviewScrollRef}
                  id="analyses-overview-content"
                  className="analyses-overview-scroll"
                >
                  <div className="analyses-overview-grid">
                    {services.map((service) => (
                      <ServiceHistoryPreview
                        key={service.serviceId}
                        serviceId={service.serviceId}
                        name={service.name}
                        regionCode={service.location.region_code}
                        period={analysisPeriod}
                        isSelected={selectedServiceId === service.serviceId}
                        onSelect={() => setSelectedServiceId(service.serviceId)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {!isOverviewCollapsed && overviewView === "ranking" && (
                <div
                  id="analyses-overview-content"
                  className="analyses-overview-ranking"
                >
                  {indicatorsLoading && !visibleServiceIndicators && (
                    <div className="analyses-history-state" role="status">
                      <h3>Carregando ranking</h3>

                      <p>
                        Consultando os indicadores dos serviços para o período
                        de {analysisPeriodLabel}.
                      </p>
                    </div>
                  )}

                  {indicatorsError && !visibleServiceIndicators && (
                    <div
                      className="analyses-history-state analyses-state-error"
                      role="alert"
                    >
                      <h3>Não foi possível carregar o ranking</h3>

                      <p>{indicatorsError}</p>
                    </div>
                  )}

                  {indicatorsError && visibleServiceIndicators && (
                    <div className="analyses-warning" role="status">
                      Não foi possível atualizar o ranking. Os últimos dados
                      válidos permanecem visíveis.
                    </div>
                  )}

                  {visibleServiceIndicators &&
                    visibleServiceIndicators.services.length === 0 && (
                      <div className="analyses-history-state" role="status">
                        <h3>Nenhum serviço disponível para o ranking</h3>

                        <p>
                          Não existem indicadores de serviços no período
                          selecionado.
                        </p>
                      </div>
                    )}

                  {visibleServiceIndicators &&
                    visibleServiceIndicators.services.length > 0 && (
                      <ImpactRanking
                        services={visibleServiceIndicators.services}
                        periodLabel={analysisPeriodLabel}
                        metric={rankingMetric}
                        onMetricChange={setRankingMetric}
                      />
                    )}
                </div>
              )}
              {isOverviewCollapsed && (
                <div className="analyses-overview-collapsed">
                  <span>{services.length} serviços</span>

                  <span aria-hidden="true">·</span>

                  <span>
                    {
                      analysisPeriods.find(
                        (period) => period.value === historyPeriodMs,
                      )?.label
                    }
                  </span>

                  <span aria-hidden="true">·</span>

                  <span>
                    {overviewView === "charts" ? "Gráficos" : "Ranking"}
                  </span>
                </div>
              )}
            </section>
          )}

          {selectedService && (
            <section
              className="analyses-history"
              aria-labelledby="history-title"
            >
              <div className="analyses-history-corner-nav">
                <button
                  type="button"
                  className="analyses-service-corner-button is-previous"
                  onClick={selectPreviousService}
                  aria-label="Serviço anterior"
                  title="Serviço anterior"
                >
                  <span aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="analyses-service-corner-button is-next"
                  onClick={selectNextService}
                  aria-label="Próximo serviço"
                  title="Próximo serviço"
                >
                  <span aria-hidden="true" />
                </button>
              </div>
              <div className="analyses-history-header">
                <div
                  key={selectedServiceId}
                  className="analyses-history-identity"
                >
                  <div className="analyses-service-badge" aria-hidden="true">
                    {getServiceInitials(selectedService.name)}
                  </div>

                  <div>
                    <p className="analyses-section-label">
                      HISTÓRICO AMBIENTAL
                    </p>

                    <h2 id="history-title">Energia estimada</h2>

                    <p className="analyses-history-service">
                      <strong>{selectedService.name}</strong>
                      <span aria-hidden="true">{" · "}</span>
                      {selectedService.location.region_code}
                    </p>
                  </div>
                </div>

                <div className="analyses-history-actions">
                  <label className="analyses-history-service-select">
                    <span>Serviço em destaque</span>

                    <select
                      value={selectedServiceId ?? ""}
                      onChange={(event) =>
                        setSelectedServiceId(Number(event.target.value))
                      }
                    >
                      {services.map((service) => (
                        <option
                          key={service.serviceId}
                          value={service.serviceId}
                        >
                          {service.name} · {service.location.region_code}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="analyses-history-unit">
                    <span>Unidade</span>
                    <strong>kWh</strong>
                  </div>
                </div>
              </div>

              {servicesError && (
                <div className="analyses-warning" role="status">
                  A lista de serviços pode estar desatualizada. Estamos usando a
                  última consulta disponível.
                </div>
              )}

              <div className="analyses-history-content">
                <div
                  key={`${selectedServiceId}-${historyPeriodMs}`}
                  className={
                    isChartTransitioning
                      ? "analyses-chameleon-transition is-active"
                      : "analyses-chameleon-transition"
                  }
                  aria-hidden="true"
                >
                  <div className="analyses-transition-glow" />

                  <div className="analyses-transition-fragments">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                {historyError && !history && (
                  <div
                    className="analyses-history-state analyses-state-error"
                    role="alert"
                  >
                    <h3>Não foi possível carregar o histórico</h3>
                    <p>{historyError}</p>
                  </div>
                )}

                {historyError && history && (
                  <div className="analyses-warning" role="status">
                    Não foi possível atualizar o histórico. Os últimos dados
                    carregados permanecem visíveis.
                  </div>
                )}

                {visibleHistory && (
                  <>
                    <dl className="analyses-history-summary">
                      <div>
                        <dt>Coletas no período</dt>
                        <dd>{visibleHistory.samples.length}</dd>
                      </div>

                      <div>
                        <dt>Com energia calculada</dt>
                        <dd>{validEnergySamples}</dd>
                      </div>

                      <div>
                        <dt>Período</dt>
                        <dd>
                          {new Date(visibleHistory.period.start).toLocaleString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                          {" — "}
                          {new Date(visibleHistory.period.end).toLocaleString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </dd>
                      </div>
                    </dl>

                    {visibleHistory.samples.length === 0 && (
                      <div className="analyses-history-state" role="status">
                        <h3>Sem histórico neste período</h3>
                        <p>
                          Ainda não existem coletas registradas para este
                          serviço no período selecionado.
                        </p>
                      </div>
                    )}

                    {visibleHistory.samples.length > 0 &&
                      validEnergySamples === 0 && (
                        <div className="analyses-history-state" role="status">
                          <h3>Energia ainda indisponível</h3>
                          <p>
                            Existem coletas no período, mas nenhuma possui dados
                            suficientes para calcular o consumo energético.
                          </p>
                        </div>
                      )}

                    {visibleHistory.samples.length > 0 &&
                      validEnergySamples > 0 && (
                        <HistoryChart
                          key={`${visibleHistory.service.serviceId}-${visibleHistory.period.start}-${visibleHistory.period.end}`}
                          samples={visibleHistory.samples}
                          periodStart={visibleHistory.period.start}
                          periodEnd={visibleHistory.period.end}
                          collectionIntervalMs={
                            visibleHistory.period.collectionIntervalMs
                          }
                          displayIntervalMs={
                            visibleHistory.period.displayIntervalMs
                          }
                        />
                      )}
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <div className="analyses-waves" aria-hidden="true" />
    </div>
  );
}

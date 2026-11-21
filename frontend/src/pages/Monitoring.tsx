import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";

import type { MapFocusRequest } from "../components/ServicesMap";
import { ServiceHud } from "../components/ServiceHud";
import "./Monitoring.css";
import logoMin from "../../assets/logo_min.png";

import { useMonitoring } from "../hooks/useMonitoring";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useServiceIndicators } from "../hooks/useServiceIndicators";
import { useAnalysisPeriod } from "../hooks/useAnalysisPeriod";
import {
  AnalysisComparisonWidget,
  AnalysisHistoryWidget,
  AnalysisProjectionWidget,
  AnalysisRankingWidget,
  type AnalysisPeriodControl,
} from "../components/AnalysisBoardWidgets";
import { MapServiceDetailsPanel } from "../components/MapServiceDetailsPanel";
import { EnvironmentOverviewDock } from "../components/EnvironmentOverviewDock";
import { RegionEnergyChart } from "../components/RegionEnergyChart";
import { ServicesMapLegend } from "../components/ServicesMapLegend";
import { MonitoringBoard } from "../components/MonitoringBoard";
import { useMonitoringBoard } from "../hooks/useMonitoringBoard";
import { FIXED_PAGE_ANALISE } from "../lib/monitoringBoard";
import type { MonitoringWidgetType } from "../lib/monitoringBoard";
import {
  formatServicePlace,
  hasServiceCoordinates,
} from "../lib/serviceLocation";

const ServicesMap = lazy(() =>
  import("../components/ServicesMap").then((module) => ({
    default: module.ServicesMap,
  })),
);

export function Monitoring() {
  const { snapshot, loading, error } = useMonitoring();

  const board = useMonitoringBoard();

  const [searchParams] = useSearchParams();
  const requestedPage = searchParams.get("pagina");

  // Links antigos de /analises caem na página fixa de análise do painel.
  useEffect(() => {
    if (requestedPage === "analise") {
      board.selectPage(FIXED_PAGE_ANALISE);
    }
  }, [requestedPage, board.selectPage]);

  const {
    dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    lastUpdated: dashboardLastUpdated,
  } = useDashboardSummary();

  const {
    periods: analysisPeriods,
    durationMs: analysisPeriodMs,
    period: analysisPeriod,
    selectPeriod,
  } = useAnalysisPeriod();

  const {
    indicators: serviceIndicators,
    loading: indicatorsLoading,
    error: indicatorsError,
  } = useServiceIndicators();

  const {
    indicators: analysisIndicators,
    loading: analysisIndicatorsLoading,
    error: analysisIndicatorsError,
  } = useServiceIndicators(analysisPeriod);

  const analysisPeriodLabel =
    analysisPeriods.find(
      (period) => period.value === analysisPeriodMs,
    )?.label ?? "Período atual";

  const periodControl: AnalysisPeriodControl = {
    periods: analysisPeriods,
    durationMs: analysisPeriodMs,
    onSelectPeriod: selectPeriod,
  };

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [mapFocus, setMapFocus] = useState<MapFocusRequest | null>(null);

  const [mapLoading, setMapLoading] = useState(true);
  const mapShellRef = useRef<HTMLDivElement>(null);

  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isFullscreenFallback, setIsFullscreenFallback] = useState(false);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  useEffect(() => {
    function syncFullscreen() {
      const active = document.fullscreenElement === mapShellRef.current;
      setIsMapFullscreen(active);
      if (!active) fullscreenButtonRef.current?.focus();
    }

    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  const isFullscreen = isMapFullscreen || isFullscreenFallback;

  useEffect(() => {
    if (!isFullscreenFallback) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fullscreenButtonRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsFullscreenFallback(false);
        fullscreenButtonRef.current?.focus();
      }
      if (event.key === "Tab") {
        const controls = Array.from(mapShellRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
        ) ?? []).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isFullscreenFallback]);

  async function toggleMapFullscreen() {
    const shell = mapShellRef.current;

    if (!shell) return;

    setFullscreenError(null);

    try {
      if (isFullscreenFallback) {
        setIsFullscreenFallback(false);
      } else if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        if (document.fullscreenEnabled && shell.requestFullscreen) {
          await shell.requestFullscreen();
        } else {
          setIsFullscreenFallback(true);
        }
      }
    } catch {
      if (document.fullscreenElement !== shell) {
        setIsFullscreenFallback(true);
        return;
      }
      setFullscreenError(
        "Não foi possível alterar a tela cheia neste navegador.",
      );
    }
  }

  const focusKeyRef = useRef(0);

  const { services, lastUpdated } = snapshot;

  const selectedService =
    services.find((service) => service.id === selectedServiceId) ?? null;


  const selectedIndicator = selectedService
    ? serviceIndicators?.services.find(
        (indicator) => indicator.serviceId === selectedService.serviceId,
      )
    : undefined;

  const servicesWithLocation = services.filter((service) =>
    hasServiceCoordinates(service.location),
  ).length;

  const stale = lastUpdated !== null && error !== null;

  const hasSyncError =
    error !== null || dashboardError !== null || indicatorsError !== null;

  const isSyncing = loading || dashboardLoading || indicatorsLoading;

  function focusServiceOnMap(id: string, options?: { scroll?: boolean }) {
    const service = services.find((item) => item.id === id);

    if (!service) return;

    const { latitude, longitude, city } = service.location;

    const hasValidLocation =
      latitude !== null &&
      longitude !== null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    /*
     * Se existe localização, a câmera vai se mover.
     * Ativamos o loading ANTES de selecionar o serviço,
     * evitando o painel aparecer por um frame.
     */
    if (hasValidLocation) {
      setMapLoading(true);
    }

    focusKeyRef.current += 1;

    const key = focusKeyRef.current;

    /*
     * O serviço é selecionado mesmo que não possua
     * coordenadas válidas.
     *
     * Dessa forma ele continua disponível no HUD
     * e no painel de detalhes, conforme a US12.
     */
    setSelectedServiceId(id);


    /*
     * Sem coordenadas, não existe destino para o mapa.
     * Limpamos apenas o foco geográfico.
     */
    if (!hasValidLocation) {
      setMapFocus(null);
      setMapLoading(false);

      return;
    }

    setMapFocus({
      key,
      latitude,
      longitude,
      label: service.name,
      city,
      place: formatServicePlace(service.location),
      scrollToMap: options?.scroll === false,
    });
  }

  function closeServiceFocus() {
    setSelectedServiceId(null);
    setMapFocus(null);
  }

  useEffect(() => {
    if (selectedServiceId === null) return;

    function deselectOutside(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(
          ".monitoring-map-shell, .service-card.is-selected, .map-service-panel, .service-hud, .services-map-shell, .map-loading-overlay, .monitoring-visualization-toggle, .region-energy-chart, .monitoring-board-toolbar, .monitoring-board-widget-bar, .monitoring-board-palette",
        )
      ) {
        return;
      }

      setSelectedServiceId(null);
    }

    function deselectOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isFullscreen) {
        setSelectedServiceId(null);
      }
    }

    document.addEventListener("pointerdown", deselectOutside);

    document.addEventListener("keydown", deselectOnEscape);

    return () => {
      document.removeEventListener("pointerdown", deselectOutside);

      document.removeEventListener("keydown", deselectOnEscape);
    };
  }, [selectedServiceId, isFullscreen]);

  const mapWidget = (
    <>
      <div
        className={`monitoring-map-shell${isFullscreen ? " is-fullscreen" : ""}${isFullscreenFallback ? " is-fullscreen-fallback" : ""}`}
        role={isFullscreenFallback ? "dialog" : undefined}
        aria-modal={isFullscreenFallback ? true : undefined}
        aria-label={isFullscreenFallback ? "Mapa em tela cheia" : undefined}
        ref={mapShellRef}
      >
        <EnvironmentOverviewDock
          energyKwh={dashboard?.summary.energyKwh ?? null}
          emissionsGco2e={dashboard?.summary.emissionsGco2e ?? null}
          activeServiceCount={dashboard?.summary.activeServiceCount ?? 0}
          noMetricsServiceCount={dashboard?.summary.noMetricsServiceCount ?? 0}
          unavailableServiceCount={
            dashboard?.summary.unavailableServiceCount ?? 0
          }
          isPartial={dashboard?.summary.isPartial ?? false}
          loading={dashboardLoading}
          error={dashboardError}
        />

        <div
          className={`services-map-workspace ${
            selectedService ? "is-focused" : ""
          }`}
        >
          <div className="services-map-stage">
            <div className="services-map-viewport">
            {/* Tela cheia */}
            <button
              type="button"
              ref={fullscreenButtonRef}
              className="monitoring-map-fullscreen-button"
              onClick={toggleMapFullscreen}
              aria-pressed={isFullscreen}
              title={
                isFullscreen ? "Sair da tela cheia (Esc)" : "Maximizar mapa"
              }
            >
              {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            </button>

            {fullscreenError && (
              <p className="monitoring-map-fullscreen-error" role="alert">
                {fullscreenError}
              </p>
            )}

            <Suspense fallback={null}>
              <ServicesMap
                services={services}
                selectedServiceId={selectedServiceId}
                onLoadingChange={setMapLoading}
                focus={mapFocus}
                onSelectService={(serviceId) =>
                  focusServiceOnMap(serviceId, {
                    scroll: false,
                  })
                }
                onClearSelection={closeServiceFocus}
              />
            </Suspense>

            {/* Transição cinematográfica */}
            {mapLoading && (
              <div
                className="map-loading-overlay"
                role="status"
                aria-label="Carregando mapa"
              >
                <span className="map-luma-flare" aria-hidden="true" />

                <img src={logoMin} alt="" className="map-loading-logo" />
              </div>
            )}
            </div>

            {/* Detalhes do serviço */}
            {selectedService && (
              <div
                className={`services-map-overlay ${
                  mapLoading ? "is-map-moving" : "is-map-ready"
                }`}
              >
                <MapServiceDetailsPanel
                  key={selectedService.id}
                  service={selectedService}
                  indicator={selectedIndicator}
                  loading={indicatorsLoading}
                  error={indicatorsError}
                  onClose={closeServiceFocus}
                />
              </div>
            )}
          </div>
        </div>

        {/* Rodapé operacional dentro do mapa em tela cheia */}
        {isFullscreen && (
          <div className="services-map-fullscreen-footer">
            <div className="services-map-hud services-map-hud-fullscreen">
              <span className="services-map-count">
                {servicesWithLocation} de {services.length} localizados
              </span>

              <ServiceHud
                services={services}
                selectedServiceId={selectedServiceId ?? undefined}
                onSelect={(serviceId) =>
                  focusServiceOnMap(serviceId, {
                    scroll: false,
                  })
                }
              />
            </div>

            <ServicesMapLegend services={services} />
          </div>
        )}
      </div>

      {/* Legenda abaixo do mapa na visualização normal */}
      {!isFullscreen && <ServicesMapLegend services={services} />}
    </>
  );

  const widgetContent: Record<MonitoringWidgetType, ReactNode> = {
    map: mapWidget,
    region: (
      <div className="monitoring-chart-shell">
        <RegionEnergyChart
          indicators={serviceIndicators?.services ?? []}
          services={services}
          loading={indicatorsLoading}
          error={indicatorsError}
        />
      </div>
    ),
    services: (
      <div className="services-map-hud services-map-hud-below">
        <span className="services-map-count">
          {servicesWithLocation} de {services.length} localizados
        </span>

        <ServiceHud
          services={services}
          selectedServiceId={selectedServiceId ?? undefined}
          onSelect={(serviceId) =>
            focusServiceOnMap(serviceId, { scroll: false })
          }
        />
      </div>
    ),
    summary: (
      <div className="monitoring-summary-shell">
        <EnvironmentOverviewDock
          energyKwh={dashboard?.summary.energyKwh ?? null}
          emissionsGco2e={dashboard?.summary.emissionsGco2e ?? null}
          activeServiceCount={dashboard?.summary.activeServiceCount ?? 0}
          noMetricsServiceCount={dashboard?.summary.noMetricsServiceCount ?? 0}
          unavailableServiceCount={
            dashboard?.summary.unavailableServiceCount ?? 0
          }
          isPartial={dashboard?.summary.isPartial ?? false}
          loading={dashboardLoading}
          error={dashboardError}
          initialCollapsed={false}
        />
      </div>
    ),
    ranking: (
      <AnalysisRankingWidget
        services={services}
        indicators={analysisIndicators}
        loading={analysisIndicatorsLoading}
        error={analysisIndicatorsError}
        periodLabel={analysisPeriodLabel}
        periodControl={periodControl}
      />
    ),
    history: (
      <AnalysisHistoryWidget
        services={services}
        period={analysisPeriod}
        periodControl={periodControl}
      />
    ),
    comparison: (
      <AnalysisComparisonWidget
        services={services}
        indicators={analysisIndicators}
        indicatorsLoading={analysisIndicatorsLoading}
        period={analysisPeriod}
        periodControl={periodControl}
      />
    ),
    projection: (
      <AnalysisProjectionWidget
        services={services}
        period={analysisPeriod}
        periodControl={periodControl}
      />
    ),
  };

  const syncStatus = (
    <details className={`monitoring-sync ${hasSyncError ? "has-error" : ""}`}>
      <summary className="monitoring-sync-label">
        <span aria-hidden="true" className="monitoring-sync-dot" />

        {hasSyncError
          ? "Atualização com falha"
          : isSyncing
            ? "Atualizando dados"
            : "Última atualização"}

        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>

      <div className="refresh-note">
        <div className="refresh-item">
          <span className="refresh-item-label">Indicadores</span>

          {dashboardLastUpdated ? (
            <time dateTime={dashboardLastUpdated}>
              {new Date(dashboardLastUpdated).toLocaleString("pt-BR")}
            </time>
          ) : (
            <span>Aguardando primeira consulta</span>
          )}
        </div>

        <div className="refresh-item">
          <span className="refresh-item-label">Serviços</span>

          {lastUpdated ? (
            <time dateTime={lastUpdated}>
              {new Date(lastUpdated).toLocaleString("pt-BR")}
            </time>
          ) : (
            <span>Aguardando primeira consulta</span>
          )}
        </div>
      </div>
    </details>
  );

  return (
    <main className="monitoring-page">
      <section className="monitoring-header">
        <div className="monitoring-intro">
          <p className="monitoring-eyebrow">
            MONITORAMENTO E ANÁLISES, EM UM SÓ LUGAR
          </p>

          <h1>
            Seu <span>workspace.</span>
          </h1>
        </div>
      </section>

      {error && (
        <div className="monitoring-stale" role="alert">
          <strong>{error}</strong>

          <p>
            {stale
              ? "Os dados abaixo são da última consulta bem-sucedida. "
              : ""}
            Uma nova tentativa será feita automaticamente.
          </p>
        </div>
      )}

      {loading && services.length === 0 && (
        <div className="monitoring-empty" role="status">
          <span className="monitoring-loader" aria-hidden="true" />

          <h2>Buscando serviços</h2>

          <p>Estamos consultando os serviços disponíveis no seu ambiente.</p>
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className="monitoring-empty" role="status">
          <h2>Nenhum serviço encontrado</h2>

          <p>
            Os serviços aparecerão aqui assim que forem identificados. A
            consulta continua automaticamente.
          </p>
        </div>
      )}

      {services.length > 0 && (
        <section className="services-map-section" aria-label="Painel de monitoramento">
          <div className="monitoring-charts-layout">
            <MonitoringBoard
              state={board}
              contents={widgetContent}
              toolbarExtra={syncStatus}
            />
          </div>
        </section>
      )}
      </main>
  );
}

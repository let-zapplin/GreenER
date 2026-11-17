import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { MapFocusRequest } from "../components/ServicesMap";
import { ServiceHud } from "../components/ServiceHud";
import "./Monitoring.css";
import logoMin from "../../assets/logo_min.png";

import { useMonitoring } from "../hooks/useMonitoring";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useServiceIndicators } from "../hooks/useServiceIndicators";
import { MapServiceDetailsPanel } from "../components/MapServiceDetailsPanel";
import { EnvironmentOverviewDock } from "../components/EnvironmentOverviewDock";
import { RegionEnergyChart } from "../components/RegionEnergyChart";
import { ServicesMapLegend } from "../components/ServicesMapLegend";
import { MonitoringBoard } from "../components/MonitoringBoard";
import { useMonitoringBoard } from "../hooks/useMonitoringBoard";
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

  const {
    dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    lastUpdated: dashboardLastUpdated,
  } = useDashboardSummary();

  const {
    indicators: serviceIndicators,
    loading: indicatorsLoading,
    error: indicatorsError,
  } = useServiceIndicators();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [mapFocus, setMapFocus] = useState<MapFocusRequest | null>(null);

  const [mapLoading, setMapLoading] = useState(true);
  const mapShellRef = useRef<HTMLDivElement>(null);

  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  useEffect(() => {
    function syncFullscreen() {
      setIsMapFullscreen(document.fullscreenElement === mapShellRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  async function toggleMapFullscreen() {
    const shell = mapShellRef.current;

    if (!shell) return;

    setFullscreenError(null);

    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
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
          ".service-card.is-selected, .map-service-panel, .service-hud, .services-map-shell, .map-loading-overlay, .monitoring-visualization-toggle, .region-energy-chart, .monitoring-board-toolbar, .monitoring-board-widget-bar, .monitoring-board-palette",
        )
      ) {
        return;
      }

      setSelectedServiceId(null);
    }

    function deselectOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedServiceId(null);
      }
    }

    document.addEventListener("pointerdown", deselectOutside);

    document.addEventListener("keydown", deselectOnEscape);

    return () => {
      document.removeEventListener("pointerdown", deselectOutside);

      document.removeEventListener("keydown", deselectOnEscape);
    };
  }, [selectedServiceId]);

  const mapWidget = (
    <>
      <div className="monitoring-map-shell" ref={mapShellRef}>
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
            {/* Tela cheia */}
            <button
              type="button"
              className="monitoring-map-fullscreen-button"
              onClick={toggleMapFullscreen}
              aria-pressed={isMapFullscreen}
              title={
                isMapFullscreen ? "Sair da tela cheia (Esc)" : "Maximizar mapa"
              }
            >
              {isMapFullscreen ? "Sair da tela cheia" : "Tela cheia"}
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
        {isMapFullscreen && (
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
      {!isMapFullscreen && <ServicesMapLegend services={services} />}
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
          <p className="monitoring-eyebrow">SEU AMBIENTE, EM UM SÓ LUGAR</p>

          <h1>
            Monitoramento de <span>serviços.</span>
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

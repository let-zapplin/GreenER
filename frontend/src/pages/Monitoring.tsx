import { lazy, Suspense, useEffect, useRef, useState } from "react";

import type { MapFocusRequest } from "../components/ServicesMap";
import { ServiceList } from "../components/ServiceList";
import { ServiceHud } from "../components/ServiceHud";
import "./Monitoring.css";
import logoMin from "../../assets/logo_min.png";

import { useMonitoring } from "../hooks/useMonitoring";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useServiceIndicators } from "../hooks/useServiceIndicators";
import { MapServiceDetailsPanel } from "../components/MapServiceDetailsPanel";
import { EnvironmentOverviewDock } from "../components/EnvironmentOverviewDock";

const ServicesMap = lazy(() =>
  import("../components/ServicesMap").then((module) => ({
    default: module.ServicesMap,
  })),
);

export function Monitoring() {
  const { snapshot, loading, error } = useMonitoring();

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

  const [selection, setSelection] = useState<{
    id: string;
    key: number;
    scroll: boolean;
  } | null>(null);

  const [mapFocus, setMapFocus] = useState<MapFocusRequest | null>(null);

  const [mapLoading, setMapLoading] = useState(true);

  const focusKeyRef = useRef(0);

  const { services, lastUpdated } = snapshot;

  const selectedService = selection
    ? (services.find((service) => service.id === selection.id) ?? null)
    : null;

  const selectedIndicator = selectedService
    ? serviceIndicators?.services.find(
        (indicator) => indicator.serviceId === selectedService.serviceId,
      )
    : undefined;

  const servicesWithLocation = services.filter(
    (service) =>
      service.location.latitude !== null && service.location.longitude !== null,
  ).length;

  const stale = lastUpdated !== null && error !== null;

  const hasSyncError =
    error !== null || dashboardError !== null || indicatorsError !== null;

  const isSyncing = loading || dashboardLoading || indicatorsLoading;

  function focusServiceOnMap(id: string, options?: { scroll?: boolean }) {
    const service = services.find((item) => item.id === id);
    if (!service) return;

    focusKeyRef.current += 1;

    const key = focusKeyRef.current;
    setSelection({ id, key, scroll: options?.scroll ?? true });

    const { latitude, longitude, city, region, country } = service.location;
    if (latitude === null || longitude === null) return;

    setMapFocus({
      key,
      latitude,
      longitude,
      label: service.name,
      city,
      place: `${city ? `${city} · ` : ""}${region}, ${country}`,
      scrollToMap: options?.scroll === false,
    });
  }

  function closeServiceFocus() {
    setSelection(null);
    setMapFocus(null);
  }

  useEffect(() => {
    if (!selection) return;

    function deselectOutside(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(
          ".service-card.is-selected, .map-service-panel, .service-hud, .services-map-shell, .map-loading-overlay",
        )
      ) {
        return;
      }

      setSelection(null);
    }

    function deselectOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelection(null);
      }
    }

    document.addEventListener("pointerdown", deselectOutside);

    document.addEventListener("keydown", deselectOnEscape);

    return () => {
      document.removeEventListener("pointerdown", deselectOutside);

      document.removeEventListener("keydown", deselectOnEscape);
    };
  }, [selection]);

  return (
    <main className="monitoring-page">
      <section className="monitoring-header">
        <div className="monitoring-intro">
          <p className="monitoring-eyebrow">SEU AMBIENTE, EM UM SÓ LUGAR</p>

          <h1>
            Monitoramento de <span>serviços.</span>
          </h1>

          <p className="monitoring-description">
            Acompanhe os serviços descobertos, sua localização e as mudanças no
            seu ambiente.
          </p>
        </div>

        <details
          className={`monitoring-sync ${hasSyncError ? "has-error" : ""}`}
        >
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

          <span className="refresh-note">
            {dashboardLastUpdated ? (
              <>
                Indicadores
                <br />
                <time dateTime={dashboardLastUpdated}>
                  {new Date(dashboardLastUpdated).toLocaleString("pt-BR")}
                </time>
              </>
            ) : (
              <>Indicadores: aguardando primeira consulta</>
            )}

            <br />
            <br />

            {lastUpdated ? (
              <>
                Serviços
                <br />
                <time dateTime={lastUpdated}>
                  {new Date(lastUpdated).toLocaleString("pt-BR")}
                </time>
              </>
            ) : (
              <>Serviços: aguardando primeira consulta</>
            )}
          </span>
        </details>
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
        <section
          className="services-map-section"
          aria-labelledby="services-map-title"
        >
          <div className="services-map-heading">
            <div>
              <p className="monitoring-section-label">
                LOCALIZAÇÃO DOS SERVIÇOS
              </p>

              <h2 id="services-map-title">Onde seus serviços estão</h2>
            </div>

            <div className="services-map-hud">
              <span className="services-map-count">
                {servicesWithLocation} de {services.length} localizados
              </span>

              <ServiceHud
                services={services}
                selectedServiceId={selection?.id}
                onSelect={(serviceId) =>
                  focusServiceOnMap(serviceId, { scroll: false })
                }
              />
            </div>
          </div>
          <div className="monitoring-map-shell">
            <EnvironmentOverviewDock
              energyKwh={dashboard?.summary.energyKwh ?? null}
              emissionsGco2e={dashboard?.summary.emissionsGco2e ?? null}
              activeServiceCount={dashboard?.summary.activeServiceCount ?? 0}
              noMetricsServiceCount={
                dashboard?.summary.noMetricsServiceCount ?? 0
              }
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
                <Suspense fallback={null}>
                  <ServicesMap
                    services={services}
                    onLoadingChange={setMapLoading}
                    focus={mapFocus}
                    onSelectService={(serviceId) =>
                      focusServiceOnMap(serviceId, { scroll: false })
                    }
                    onClearSelection={closeServiceFocus}
                  />
                </Suspense>

                {mapLoading && (
                  <div
                    className="map-loading-overlay"
                    role="status"
                    aria-label="Carregando mapa"
                  >
                    <img src={logoMin} alt="" className="map-loading-logo" />
                  </div>
                )}

                {selectedService && (
                  <div className="services-map-overlay">
                    <MapServiceDetailsPanel
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
          </div>
        </section>
      )}

      {services.length > 0 && (
        <>
          <div className="monitoring-list-heading">
            <div>
              <p className="monitoring-section-label">SERVIÇOS</p>

              <h2 id="service-list-title">Detalhes do ambiente</h2>
            </div>

            <span>
              {services.length} {services.length === 1 ? "serviço" : "serviços"}
            </span>
          </div>

          <ServiceList
            services={services}
            selection={selection}
            onSelect={focusServiceOnMap}
            indicators={serviceIndicators?.services ?? []}
            indicatorsLoading={indicatorsLoading}
            indicatorsError={indicatorsError}
          />
        </>
      )}
    </main>
  );
}

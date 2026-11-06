import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import type { MapFocusRequest } from "../components/ServicesMap";
import { ServiceList } from "../components/ServiceList";
import "./Monitoring.css";
import { DashboardSummary } from "../components/DashboardSummary";
import { useMonitoring } from "../hooks/useMonitoring";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useServiceIndicators } from "../hooks/useServiceIndicators";

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

  const [mapFocus, setMapFocus] =
    useState<MapFocusRequest | null>(null);

  const focusKeyRef = useRef(0);

  const { services, lastUpdated } = snapshot;

  const servicesWithLocation = services.filter(
    (service) =>
      service.location.latitude !== null &&
      service.location.longitude !== null,
  ).length;

  const stale =
    lastUpdated !== null &&
    error !== null;

  const hasSyncError =
    error !== null ||
    dashboardError !== null ||
    indicatorsError !== null;

  const isSyncing =
    loading ||
    dashboardLoading ||
    indicatorsLoading;

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

  useEffect(() => {
    if (!selection) return;

    function deselectOutside(
      event: PointerEvent,
    ) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(
          ".service-card.is-selected",
        )
      ) {
        return;
      }

      setSelection(null);
    }

    function deselectOnEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setSelection(null);
      }
    }

    document.addEventListener(
      "pointerdown",
      deselectOutside,
    );

    document.addEventListener(
      "keydown",
      deselectOnEscape,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        deselectOutside,
      );

      document.removeEventListener(
        "keydown",
        deselectOnEscape,
      );
    };
  }, [selection]);

  return (
    <main className="monitoring-page">
      <section className="monitoring-header">
        <div className="monitoring-intro">
          <p className="monitoring-eyebrow">
            SEU AMBIENTE, EM UM SÓ LUGAR
          </p>

          <h1>
            Monitoramento de{" "}
            <span>serviços.</span>
          </h1>

          <p className="monitoring-description">
            Acompanhe os serviços descobertos,
            sua localização e as mudanças no
            seu ambiente.
          </p>
        </div>

        <details
          className={`monitoring-sync ${
            hasSyncError
              ? "has-error"
              : ""
          }`}
        >
          <summary className="monitoring-sync-label">
            <span
              aria-hidden="true"
              className="monitoring-sync-dot"
            />

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

                <time
                  dateTime={
                    dashboardLastUpdated
                  }
                >
                  {new Date(
                    dashboardLastUpdated,
                  ).toLocaleString(
                    "pt-BR",
                  )}
                </time>
              </>
            ) : (
              <>
                Indicadores: aguardando
                primeira consulta
              </>
            )}

            <br />
            <br />

            {lastUpdated ? (
              <>
                Serviços
                <br />

                <time
                  dateTime={
                    lastUpdated
                  }
                >
                  {new Date(
                    lastUpdated,
                  ).toLocaleString(
                    "pt-BR",
                  )}
                </time>
              </>
            ) : (
              <>
                Serviços: aguardando primeira
                consulta
              </>
            )}
          </span>
        </details>
      </section>

      {error && (
        <div
          className="monitoring-stale"
          role="alert"
        >
          <strong>{error}</strong>

          <p>
            {stale
              ? "Os dados abaixo são da última consulta bem-sucedida. "
              : ""}

            Uma nova tentativa será feita
            automaticamente.
          </p>
        </div>
      )}

      {loading &&
        services.length === 0 && (
          <div
            className="monitoring-empty"
            role="status"
          >
            <span
              className="monitoring-loader"
              aria-hidden="true"
            />

            <h2>Buscando serviços</h2>

            <p>
              Estamos consultando os serviços
              disponíveis no seu ambiente.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        services.length === 0 && (
          <div
            className="monitoring-empty"
            role="status"
          >
            <h2>
              Nenhum serviço encontrado
            </h2>

            <p>
              Os serviços aparecerão aqui
              assim que forem identificados.
              A consulta continua
              automaticamente.
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

              <h2 id="services-map-title">
                Onde seus serviços estão
              </h2>
            </div>

            <span>
              {servicesWithLocation} de{" "}
              {services.length}{" "}
              {services.length === 1
                ? "serviço localizado"
                : "serviços localizados"}
            </span>
          </div>

          <Suspense
            fallback={
              <div
                className="services-map-loading"
                role="status"
                aria-label="Carregando mapa"
              >
                <span
                  className="monitoring-loader"
                  aria-hidden="true"
                />
              </div>
            }
          >
            <ServicesMap
              services={services}
              focus={mapFocus}
            />
          </Suspense>
        </section>
      )}

      <DashboardSummary
        dashboard={dashboard}
        loading={dashboardLoading}
        error={dashboardError}
      />

      {services.length > 0 && (
        <>
          <div className="monitoring-list-heading">
            <div>
              <p className="monitoring-section-label">
                SERVIÇOS
              </p>

              <h2 id="service-list-title">
                Detalhes do ambiente
              </h2>
            </div>

            <span>
              {services.length}{" "}
              {services.length === 1
                ? "serviço"
                : "serviços"}
            </span>
          </div>

          <ServiceList
            services={services}
            selection={selection}
            onSelect={focusServiceOnMap}
            indicators={
              serviceIndicators?.services ??
              []
            }
            indicatorsLoading={
              indicatorsLoading
            }
            indicatorsError={
              indicatorsError
            }
          />
        </>
      )}
    </main>
  );
}
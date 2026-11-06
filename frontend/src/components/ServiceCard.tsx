import { useId, useLayoutEffect, useRef } from "react";
import type { MonitoredService } from "../types/service";
import type { ServiceIndicators } from "../types/indicators";
import "./ServiceCard.css";

type ServiceCardProps = {
  service: MonitoredService;
  indicator?: ServiceIndicators;
  indicatorsLoading: boolean;
  indicatorsError: string | null;
  selectionKey?: number;
  onSelect: (id: string) => void;
};

function getStatusLabel(status: MonitoredService["status"]) {
  switch (status) {
    case "active":
      return "Ativo";

    case "new":
      return "Novo";

    case "returned":
      return "Retornou";

    case "no_metrics":
      return "Sem métricas";

    case "unavailable":
      return "Indisponível";

    case "removed":
      return "Removido";
  }
}

export function ServiceCard({
  service,
  indicator,
  indicatorsLoading,
  indicatorsError,
  selectionKey,
  onSelect,
}: ServiceCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const hasLocation =
    service.location.latitude !== null && service.location.longitude !== null;

  useLayoutEffect(() => {
    if (selectionKey === undefined) return;

    const frame = requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      });
      cardRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectionKey]);

  const latestSample = indicator?.latestSampleInPeriod ?? null;
  const metrics = latestSample?.metrics ?? null;

  const energyKwh = indicator?.periodTotals.energyKwh ?? null;
  const emissionsGco2e = indicator?.periodTotals.emissionsGco2e ?? null;
  const indicatorsPartial =
  indicator?.periodTotals.isPartial ?? false;

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      onClick={hasLocation ? () => onSelect(service.id) : undefined}
      className={`service-card ${service.status}${selectionKey !== undefined ? " is-selected" : ""}${hasLocation ? " is-focusable" : ""}`}
    >
      <div className="service-card-header">
        <div className="service-card-identity">
          <span className="service-card-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="7" rx="2" />
              <rect x="3" y="14" width="18" height="7" rx="2" />
              <path
                d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h3 id={titleId}>{service.name}</h3>
            <span className="service-region-code">
              {service.location.region_code}
            </span>
          </div>
        </div>

        <div className="service-card-header-actions">
          <span className={`service-status-badge ${service.status}`}>
            {getStatusLabel(service.status)}
          </span>

          <button
            type="button"
            className="service-card-map-button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(service.id);
            }}
            disabled={!hasLocation}
            aria-label={`Ver ${service.name} no mapa`}
            title={
              hasLocation
                ? `Aproximar o mapa em ${service.location.city ?? service.location.region}`
                : "Serviço sem localização cadastrada"
            }
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="6" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
            </svg>
            Ver no mapa
          </button>
        </div>
      </div>

<div className="service-card-location">
  <span className="service-location-label">
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>

    Localização
  </span>

  <p className="service-location-value">
    {service.location.city
      ? `${service.location.city} · `
      : ""}
    {service.location.region}, {service.location.country}
  </p>
</div>
<div className="service-card-indicators">
  <div className="service-card-indicators-header">
    <span>Métricas e impacto</span>

    {latestSample && (
      <time dateTime={latestSample.attemptedAt}>
        {new Date(latestSample.attemptedAt).toLocaleString("pt-BR")}
      </time>
    )}
  </div>

  {indicatorsLoading && !indicator && (
    <p className="service-card-indicators-state">
      Carregando indicadores...
    </p>
  )}

  {!indicatorsLoading && indicatorsError && !indicator && (
    <p className="service-card-indicators-state">
      Indicadores temporariamente indisponíveis.
    </p>
  )}

  {!indicatorsLoading && !indicatorsError && !indicator && (
    <p className="service-card-indicators-state">
      Ainda não há indicadores disponíveis para este serviço.
    </p>
  )}

{indicator && indicatorsPartial && selectionKey !== undefined && (
  <span className="service-card-partial">
    Dados parciais no período
  </span>
)}

{indicator && (
  <>
    <div className="service-card-impact">
      <div>
        <span>Energia · 24h</span>

        <strong>
          {energyKwh !== null
            ? `${energyKwh.toLocaleString("pt-BR", {
                minimumFractionDigits: 4,
                maximumFractionDigits: 6,
              })} kWh`
            : "—"}
        </strong>
      </div>

      <div>
        <span>CO₂e · 24h</span>

        <strong>
          {emissionsGco2e !== null
            ? `${emissionsGco2e.toLocaleString("pt-BR", {
                minimumFractionDigits: 4,
                maximumFractionDigits: 6,
              })} gCO₂e`
            : "—"}
        </strong>
      </div>
    </div>

    <div className="service-card-metrics">
      <div>
        <span>CPU</span>
        <strong>
          {metrics
            ? `${metrics.cpuPercent.toLocaleString("pt-BR", {
                maximumFractionDigits: 2,
              })}%`
            : "—"}
        </strong>
      </div>

      <div>
        <span>Memória</span>
        <strong>
          {metrics
            ? `${metrics.memoryGb.toLocaleString("pt-BR", {
                maximumFractionDigits: 2,
              })} GB`
            : "—"}
        </strong>
      </div>

      <div>
        <span>Disco</span>
        <strong>
          {metrics
            ? `${metrics.diskGb.toLocaleString("pt-BR", {
                maximumFractionDigits: 2,
              })} GB`
            : "—"}
        </strong>
      </div>

      <div>
        <span>Rede</span>
        <strong>
          {metrics
            ? `${metrics.networkGb.toLocaleString("pt-BR", {
                maximumFractionDigits: 2,
              })} GB`
            : "—"}
        </strong>
      </div>
    </div>
  </>
)}
</div>

      {service.status === "no_metrics" && (
        <p className="service-card-note">
          Continua ativo no catálogo, mas a última coleta não retornou métricas.
          {service.lastCollectionAt
            ? ` Última tentativa em ${new Date(
                service.lastCollectionAt,
              ).toLocaleString("pt-BR")}.`
            : ""}
        </p>
      )}
    </article>
  );
}

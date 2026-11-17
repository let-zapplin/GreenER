import { Link } from "react-router-dom";

import type { ServiceIndicators } from "../types/indicators";
import type { MonitoredService } from "../types/service";
import { ServiceMiniHistoryChart } from "./ServiceMiniHistoryChart";
import "./MapServiceDetailsPanel.css";

type MapServiceDetailsPanelProps = {
  service: MonitoredService;
  indicator?: ServiceIndicators;
  loading: boolean;
  error: string | null;
  onClose: () => void;
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

    case "error":
      return "Erro na coleta";

    case "removed":
      return "Removido";
  }
}

export function MapServiceDetailsPanel({
  service,
  indicator,
  loading,
  error,
  onClose,
}: MapServiceDetailsPanelProps) {
  const latestSample = indicator?.latestSampleInPeriod ?? null;

  const metrics = latestSample?.metrics ?? null;

  const energyKwh = indicator?.periodTotals.energyKwh ?? null;

  const emissionsGco2e = indicator?.periodTotals.emissionsGco2e ?? null;

  const location = [
    service.location.city,
    service.location.region,
    service.location.country,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside
      className={`map-service-panel ${service.status}`}
      aria-label={`Detalhes de ${service.name}`}
    >
      <div className="map-service-panel-accent" />

      <div className="map-service-panel-header">
        <div>
          <span className="map-service-panel-eyebrow">SERVIÇO SELECIONADO</span>

          <h3>{service.name}</h3>

          <span className="map-service-panel-region">
            {service.location.region_code}
          </span>
        </div>

        <button
          type="button"
          className="map-service-panel-close"
          onClick={onClose}
          aria-label="Fechar detalhes do serviço"
        >
          ×
        </button>
      </div>

      <div className="map-service-panel-status-row">
        <span className={`map-service-panel-status ${service.status}`}>
          <span aria-hidden="true" />
          {getStatusLabel(service.status)}
        </span>

        {indicator?.periodTotals.isPartial && (
          <span className="map-service-panel-partial">Dados parciais</span>
        )}
      </div>

      <div className="map-service-panel-location">
        <span>Localização</span>
        <strong>{location}</strong>
      </div>

      <div className="map-service-panel-impact">
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

      <div className="map-service-panel-metrics">
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

      <ServiceMiniHistoryChart serviceId={service.serviceId} />
      {latestSample && (
        <div className="map-service-panel-updated">
          Última coleta
          <time dateTime={latestSample.attemptedAt}>
            {new Date(latestSample.attemptedAt).toLocaleString("pt-BR")}
          </time>
        </div>
      )}

      {loading && !indicator && (
        <p className="map-service-panel-message">Carregando indicadores...</p>
      )}

      {error && !indicator && (
        <p className="map-service-panel-message">
          Indicadores temporariamente indisponíveis.
        </p>
      )}

      <Link
        className="map-service-panel-analysis"
        to={`/analises?serviceId=${service.serviceId}`}
      >
        Ver análise
        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}

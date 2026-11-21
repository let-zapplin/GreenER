import type { MonitoredService, ServiceStatus } from "../types/service";
import "./ServicesMap.css";

export const statusPriority: ServiceStatus[] = [
  "unavailable",
  "error",
  "removed",
  "no_metrics",
  "new",
  "returned",
  "active",
];

export const statusLabels: Record<ServiceStatus, string> = {
  active: "Ativo",
  new: "Novo",
  returned: "Retornou",
  no_metrics: "Sem métricas",
  unavailable: "Indisponível",
  error: "Erro na coleta",
  removed: "Removido",
};

export function ServicesMapLegend({ services }: { services: MonitoredService[] }) {
  // "Ativo" é o estado padrão dos serviços; a legenda só destaca anomalias.
  const statuses = statusPriority.filter(
    (status) =>
      status !== "active" &&
      services.some((service) => service.status === status),
  );
  const withoutLocation = services.filter((service) =>
    service.location.latitude === null || service.location.longitude === null,
  ).length;

  if (statuses.length === 0 && withoutLocation === 0) {
    return null;
  }

  return (
    <div className="services-map-footer">
      <ul className="services-map-legend" aria-label="Legenda dos status">
        {statuses.map((status) => (
          <li key={status}>
            <span className={`services-map-legend-dot ${status}`} aria-hidden="true" />
            {statusLabels[status]}
          </li>
        ))}
      </ul>
      {withoutLocation > 0 && (
        <p className="services-map-note">
          {withoutLocation}{" "}
          {withoutLocation === 1
            ? "serviço sem localização cadastrada"
            : "serviços sem localização cadastrada"}
        </p>
      )}
    </div>
  );
}

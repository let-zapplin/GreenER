import type { MonitoredService, ServiceStatus } from "../types/service";
import "./ServicesMap.css";

export const statusPriority: ServiceStatus[] = [
  "unavailable", "removed", "no_metrics", "new", "returned", "active",
];

export const statusLabels: Record<ServiceStatus, string> = {
  active: "Ativo",
  new: "Novo",
  returned: "Retornou",
  no_metrics: "Sem métricas",
  unavailable: "Indisponível",
  removed: "Removido",
};

export function ServicesMapLegend({ services }: { services: MonitoredService[] }) {
  const statuses = statusPriority.filter((status) =>
    services.some((service) => service.status === status),
  );
  const withoutLocation = services.filter((service) =>
    service.location.latitude === null || service.location.longitude === null,
  ).length;

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

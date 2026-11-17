import type {
  MonitoredService,
  ServiceStatus,
} from "../types/service";
import {
  formatServicePlace,
  hasServiceCoordinates,
} from "../lib/serviceLocation";

import "./ServiceHud.css";

type ServiceHudProps = {
  services: MonitoredService[];
  selectedServiceId?: string;
  onSelect: (serviceId: string) => void;
};

const STATUS_LABELS: Record<
  ServiceStatus,
  string
> = {
  active: "Ativo",
  new: "Novo",
  returned: "Retornou",
  unavailable: "Indisponível",
  no_metrics: "Sem métricas",
  removed: "Removido",
};

function getServiceInitials(
  name: string,
): string {
    return name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

export function ServiceHud({
  services,
  selectedServiceId,
  onSelect,
}: ServiceHudProps) {
  return (
    <div
      className="service-hud"
      aria-label="Serviços monitorados"
    >
      {services.map((service) => {
        const isSelected =
          selectedServiceId === service.id;

        const hasLocation = hasServiceCoordinates(
          service.location,
        );

        const place = formatServicePlace(
          service.location,
        );

        return (
          <button
            key={service.id}
            type="button"
            className={`service-hud-item ${
              isSelected ? "is-selected" : ""
            } ${
              !hasLocation
                ? "is-unlocated"
                : ""
            }`}
            data-status={service.status}
            onClick={() =>
              onSelect(service.id)
            }
            title={`${service.name} · ${place} · ${
              STATUS_LABELS[service.status]
            }`}
            aria-label={`${service.name}. ${place}. ${
              STATUS_LABELS[service.status]
            }${
              hasLocation
                ? ". Ver no mapa."
                : ". Sem coordenadas no mapa; abre os detalhes."
            }`}
            aria-pressed={isSelected}
          >
            <span
              className="service-hud-hexagon"
              aria-hidden="true"
            >
              <span>
                {getServiceInitials(
                  service.name,
                )}
              </span>
            </span>

            <span className="service-hud-name">
              {service.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
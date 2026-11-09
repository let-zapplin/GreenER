import type { MonitoredService } from "../types/service";
import "./ServicePopover.css";

type ServicePopoverProps = {
  service: MonitoredService;
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

export function ServicePopover({ service }: ServicePopoverProps) {
  return (
    <div className="service-popover" role="tooltip">
      <div className="service-popover-header">
        <strong>{service.name}</strong>

        <span className={`service-popover-status ${service.status}`}>
          {getStatusLabel(service.status)}
        </span>
      </div>

      {service.status === "no_metrics" && (
        <p className="service-popover-note">
          Segue ativo no catálogo; a última coleta não retornou métricas.
        </p>
      )}

      <div className="service-popover-location">
        <span>{service.location.city ?? "Cidade não informada"}</span>

        <span>
          {service.location.region}, {service.location.country}
        </span>

        <small>{service.location.region_code}</small>
      </div>
    </div>
  );
}

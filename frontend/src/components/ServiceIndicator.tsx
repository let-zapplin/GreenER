import type { MonitoredService } from "../types/service";
import { ServicePopover } from "./ServicePopover";

const statusLabels = {
  active: "Ativo",
  new: "Novo serviço detectado",
  returned: "Serviço retornou",
  removed: "Serviço removido do catálogo",
};

type ServiceIndicatorProps = {
  service: MonitoredService;
  onSelect: (id: string) => void;
};

export function ServiceIndicator({ service, onSelect }: ServiceIndicatorProps) {
  return (
    <div className="service-indicator-wrapper">
      <button
        type="button"
        className={`service-indicator ${service.status}`}
        aria-label={`${service.name}: ${statusLabels[service.status]}. Ver detalhes`}
        onClick={() => onSelect(service.id)}
      />

      <ServicePopover service={service} />
    </div>
  );
}

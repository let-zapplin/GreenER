import type { MonitoredService } from "../types/service";

const statusLabels = {
  active: "Ativo",
  new: "Novo serviço detectado",
  returned: "Serviço retornou",
  unavailable: "Serviço indisponível",
};

type ServiceIndicatorProps = {
  service: MonitoredService;
  onSelect: (id: string) => void;
};

export function ServiceIndicator({ service, onSelect }: ServiceIndicatorProps) {
  return (
    <button
      type="button"
      className={`service-indicator ${service.status}`}
      aria-label={`${service.name}: ${statusLabels[service.status]}. Ver detalhes`}
      onClick={() => onSelect(service.id)}
    />
  );
}

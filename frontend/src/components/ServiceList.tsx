import type { MonitoredService } from "../types/service";
import { ServiceCard } from "./ServiceCard";
import "./ServiceList.css";

type ServiceListProps = {
  services: MonitoredService[];
  selection: { id: string; key: number } | null;
};

export function ServiceList({ services, selection }: ServiceListProps) {
  return (
    <section className="service-list" aria-labelledby="service-list-title">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          selectionKey={
            selection?.id === service.id ? selection.key : undefined
          }
        />
      ))}
    </section>
  );
}

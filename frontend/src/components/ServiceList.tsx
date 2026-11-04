import type { MonitoredService } from "../types/service";
import type { ServiceIndicators } from "../types/indicators";
import { ServiceCard } from "./ServiceCard";
import "./ServiceList.css";

type ServiceListProps = {
  services: MonitoredService[];
  selection: { id: string; key: number } | null;

  indicators: ServiceIndicators[];
  indicatorsLoading: boolean;
  indicatorsError: string | null;
};

export function ServiceList({
  services,
  selection,
  indicators,
  indicatorsLoading,
  indicatorsError,
}: ServiceListProps) {
  return (
    <section className="service-list" aria-labelledby="service-list-title">
      {services.map((service) => {
       const indicator = indicators.find(
        (item)=> item.serviceId === service.serviceId,
       );
       return(
        <ServiceCard
        key={service.id}
        service={service}
        indicator={indicator}
        indicatorsLoading={indicatorsLoading}
        indicatorsError={indicatorsError}
        selectionKey={selection?.id === service.id ? selection.key : undefined
           }
          />
        );
      })}
             
  
    </section>
  );
}

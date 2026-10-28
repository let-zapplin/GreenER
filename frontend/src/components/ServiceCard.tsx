import { useId, useLayoutEffect, useRef } from "react";
import type { MonitoredService } from "../types/service";
import "./ServiceCard.css";

type ServiceCardProps = {
  service: MonitoredService;
  selectionKey?: number;
};

function getStatusLabel(status: MonitoredService["status"]) {
  switch (status) {
    case "active":
      return "Ativo";

    case "new":
      return "Novo";

    case "returned":
      return "Retornou";

    case "unavailable":
      return "Indisponível";

    case "removed":
      return "Removido";
  }
}

export function ServiceCard({ service, selectionKey }: ServiceCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const titleId = useId();

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

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={`service-card ${service.status}${selectionKey !== undefined ? " is-selected" : ""}`}
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

        <span className={`service-status-badge ${service.status}`}>
          {getStatusLabel(service.status)}
        </span>
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
        <p>{service.location.city ?? "Cidade não informada"}</p>

        <p>
          {service.location.region}, {service.location.country}
        </p>
      </div>
    </article>
  );
}

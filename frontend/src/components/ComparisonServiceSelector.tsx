import type { MonitoredService } from "../types/service";
import { formatServicePlace } from "../lib/serviceLocation";
import "./ComparisonServiceSelector.css";

type ComparisonServiceSelectorProps = {
  services: MonitoredService[];
  selectedServiceIds: number[];
  minServices: number;
  maxServices: number;
  canCompare: boolean;
  limitReached: boolean;
  onToggleService: (serviceId: number) => void;
};

export function ComparisonServiceSelector({
  services,
  selectedServiceIds,
  minServices,
  maxServices,
  canCompare,
  limitReached,
  onToggleService,
}: ComparisonServiceSelectorProps) {
  const selectedCount = selectedServiceIds.length;

  return (
    <section
      className="comparison-service-selector"
      aria-labelledby="comparison-services-title"
    >
      <div className="comparison-service-selector-header">
        <div>
          <p className="analyses-section-label">COMPARAÇÃO</p>

          <h2 id="comparison-services-title">
            Serviços para comparar
          </h2>

          <p>
            Selecione entre {minServices} e {maxServices} serviços para
            analisar no mesmo período.
          </p>
        </div>

        <span className="comparison-service-count">
          {selectedCount}/{maxServices} selecionados
        </span>
      </div>

      <div className="comparison-service-grid">
        {services.map((service) => {
          const isSelected = selectedServiceIds.includes(
            service.serviceId,
          );

          const isDisabled =
            limitReached && !isSelected;

          return (
            <label
              key={service.serviceId}
              className={
                isSelected
                  ? "comparison-service-option is-selected"
                  : "comparison-service-option"
              }
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() =>
                  onToggleService(service.serviceId)
                }
              />

              <span className="comparison-service-check">
                {isSelected ? "✓" : ""}
              </span>

              <span className="comparison-service-info">
                <strong>{service.name}</strong>

                <small>
                  {formatServicePlace(service.location)}
                </small>
              </span>
            </label>
          );
        })}
      </div>

      <div
        className="comparison-service-feedback"
        role="status"
      >
        {selectedCount === 0 && (
          <span>
            Selecione pelo menos {minServices} serviços.
          </span>
        )}

        {selectedCount > 0 && !canCompare && (
          <span>
            Selecione mais{" "}
            {minServices - selectedCount} serviço.
          </span>
        )}

        {canCompare && !limitReached && (
          <span>
            {selectedCount} serviços selecionados. A comparação já pode
            ser realizada.
          </span>
        )}

        {limitReached && (
          <span>
            Limite de {maxServices} serviços atingido.
          </span>
        )}
      </div>
    </section>
  );
}
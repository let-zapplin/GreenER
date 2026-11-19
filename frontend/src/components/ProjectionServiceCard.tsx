import { useState } from "react";

import type { MonitoredService, ServiceStatus } from "../types/service";

import { formatServicePlace } from "../lib/serviceLocation";

import type { ProjectionRegion } from "../types/projection";

import "./ProjectionServiceCard.css";

type ProjectionServiceCardProps = {
  service: MonitoredService | null;

  services: MonitoredService[];

  selectedServiceId: number | null;

  energyKwh: number | null;

  isPartial: boolean;

  regions?: ProjectionRegion[];

  selectedRegionCodes?: string[];

  currentRegionCode?: string | null;

  onChangeService: (serviceId: number) => void;

  onToggleRegion?: (regionCode: string) => void;
};

function getStatusLabel(status: ServiceStatus): string {
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

    case "error":
      return "Erro na coleta";

    case "removed":
      return "Removido";
  }
}

function formatEnergy(energyKwh: number | null): string {
  if (energyKwh === null) {
    return "Aguardando projeção";
  }

  return `${energyKwh.toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} kWh`;
}

export function ProjectionServiceCard({
  service,
  services,
  selectedServiceId,
  energyKwh,
  isPartial,
  regions = [],
  selectedRegionCodes = [],
  currentRegionCode = null,
  onChangeService,
  onToggleRegion,
}: ProjectionServiceCardProps) {
  const [isServiceMenuOpen, setIsServiceMenuOpen] = useState(false);
  return (
    <section
      className="projection-service-card"
      aria-labelledby="projection-service-title"
    >
      <div className="projection-service-card-header">
        <div>
          <p className="analyses-section-label">SERVIÇO DE ORIGEM</p>

          <h3 id="projection-service-title">Serviço analisado</h3>
        </div>

        {service && (
          <span className={`projection-service-status ${service.status}`}>
            {getStatusLabel(service.status)}
          </span>
        )}
      </div>

      {service && (
        <>
          <div className="projection-service-selector-wrapper">
            <button
              type="button"
              className={
                isServiceMenuOpen
                  ? "projection-service-identity is-open"
                  : "projection-service-identity"
              }
              onClick={() => setIsServiceMenuOpen((current) => !current)}
              aria-expanded={isServiceMenuOpen}
              aria-haspopup="listbox"
            >
              <span className="projection-service-icon" aria-hidden="true">
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

              <span className="projection-service-identity-info">
                <strong>{service.name}</strong>

                <small>{service.location.region_code}</small>
              </span>

              <span
                className="projection-service-selector-arrow"
                aria-hidden="true"
              >
                {isServiceMenuOpen ? "▲" : "▼"}
              </span>
            </button>

            {isServiceMenuOpen && (
              <div
                className="projection-service-menu"
                role="listbox"
                aria-label="Selecionar serviço para projeção"
              >
                {services.map((item) => {
                  const isSelected = item.serviceId === selectedServiceId;

                  return (
                    <button
                      key={item.serviceId}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={
                        isSelected
                          ? "projection-service-menu-option is-selected"
                          : "projection-service-menu-option"
                      }
                      onClick={() => {
                        onChangeService(item.serviceId);

                        setIsServiceMenuOpen(false);
                      }}
                    >
                      <span>
                        <strong>{item.name}</strong>

                        <small>{formatServicePlace(item.location)}</small>
                      </span>

                      <span className="projection-service-menu-region">
                        {item.location.region_code}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="projection-service-location">
            <span>Localização atual</span>

            <strong>{formatServicePlace(service.location)}</strong>
          </div>

          <div
  className="projection-service-divider"
  aria-hidden="true"
/>

<div className="projection-service-regions">
  <div className="projection-service-regions-header">
    <div>
      <span className="projection-service-regions-label">
        LOCALIDADES DISPONÍVEIS
      </span>

      <strong>
        Selecionar regiões
      </strong>
    </div>

    <span className="projection-service-regions-count">
      {selectedRegionCodes.length} selecionadas
    </span>
  </div>

  <p className="projection-service-regions-description">
    Escolha as localidades que deseja comparar com
    o serviço atual.
  </p>

  <div className="projection-service-region-list">
    {regions
      .filter(
        (region) =>
          region.regionCode !==
          currentRegionCode,
      )
      .map((region) => {
        const isSelected =
          selectedRegionCodes.includes(
            region.regionCode,
          );

        return (
          <button
            key={region.regionCode}
            type="button"
            className={
              isSelected
                ? "projection-service-region is-selected"
                : "projection-service-region"
            }
            aria-pressed={isSelected}
            onClick={() =>
              onToggleRegion?.(
                region.regionCode,
              )
            }
          >
            <span className="projection-service-region-check">
              {isSelected ? "✓" : "+"}
            </span>

            <span className="projection-service-region-info">
              <strong>
                {region.region}
              </strong>

              <small>
                {region.regionCode}
              </small>
            </span>

            <span className="projection-service-region-impact">
              {
                region.carbonIntensityGco2ePerKwh
              }{" "}
              gCO₂e/kWh
            </span>
          </button>
        );
      })}
  </div>
</div>

<div
  className="projection-service-divider"
  aria-hidden="true"
/>

          <div className="projection-service-energy">
            <div>
              <span>Energia observada no período</span>

              <strong>{formatEnergy(energyKwh)}</strong>
            </div>

            {isPartial && (
              <span className="projection-service-partial">Dados parciais</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

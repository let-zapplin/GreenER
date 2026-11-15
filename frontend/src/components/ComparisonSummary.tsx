import type { ServiceIndicators } from "../types/indicators";

import {
  getComparisonServiceColor,
  getComparisonServiceOpacity,
} from "../lib/comparisonVisual";

import "./ComparisonSummary.css";

type ComparisonSummaryProps = {
  services: ServiceIndicators[];

  selectedServiceIds: number[];

  focusServiceId: number | null;

  onFocusServiceChange: (
    serviceId: number,
  ) => void;
};

type ResourceMetric = {
  key: string;
  label: string;
  unit: string;

  getValue: (
    service: ServiceIndicators,
  ) => number | null;
};

const RESOURCE_METRICS: ResourceMetric[] = [
  {
    key: "cpu",
    label: "CPU média",
    unit: "%",
    getValue: (service) =>
      service.resourceSummary.cpu.averagePercent,
  },
  {
    key: "memory",
    label: "Memória média",
    unit: "GB",
    getValue: (service) =>
      service.resourceSummary.memory.averageGb,
  },
  {
    key: "disk",
    label: "Disco médio",
    unit: "GB",
    getValue: (service) =>
      service.resourceSummary.disk.averageGb,
  },
  {
    key: "network",
    label: "Rede total",
    unit: "GB",
    getValue: (service) =>
      service.resourceSummary.network.totalGb,
  },
];

function formatEnergy(
  value: number,
): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} kWh`;
}

function formatEmissions(
  value: number,
): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} gCO₂e`;
}

function formatPercent(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function formatGb(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })} GB`;
}

function formatResourceValue(
  value: number | null,
  unit: string,
): string {
  if (value === null) {
    return "—";
  }

  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits:
      unit === "%" ? 1 : 2,
  })} ${unit}`;
}

type ImpactBarsProps = {
  title: string;

  services: ServiceIndicators[];

  selectedServiceIds: number[];

  focusServiceId: number | null;

  maxValue: number;

  getValue: (
    service: ServiceIndicators,
  ) => number;

  formatValue: (
    value: number,
  ) => string;

  onFocusServiceChange: (
    serviceId: number,
  ) => void;
};

function ImpactBars({
  title,
  services,
  selectedServiceIds,
  focusServiceId,
  maxValue,
  getValue,
  formatValue,
  onFocusServiceChange,
}: ImpactBarsProps) {
  return (
    <div className="comparison-impact-chart">
      <h3>{title}</h3>

      <div className="comparison-impact-list">
        {services.map((service) => {
          const value =
            getValue(service);

          const percentage =
            maxValue > 0
              ? (value / maxValue) * 100
              : 0;

          const isFocused =
            service.serviceId ===
            focusServiceId;

          return (
            <button
              key={service.serviceId}
              type="button"
              className={
                isFocused
                  ? "comparison-impact-item is-focused"
                  : "comparison-impact-item"
              }
              onClick={() =>
                onFocusServiceChange(
                  service.serviceId,
                )
              }
            >
              <div className="comparison-impact-item-header">
                <span>
                  {service.name}
                </span>

                <strong>
                  {formatValue(value)}
                </strong>
              </div>

              <span className="comparison-impact-track">
                <span
                  className="comparison-impact-fill"
                  style={{
                    width: `${percentage}%`,
                    background:
                      getComparisonServiceColor(
                        service.serviceId,
                        selectedServiceIds,
                      ),
                    opacity:
                      getComparisonServiceOpacity(
                        service.serviceId,
                        selectedServiceIds,
                        focusServiceId,
                      ),
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ComparisonSummary({
  services,
  selectedServiceIds,
  focusServiceId,
  onFocusServiceChange,
}: ComparisonSummaryProps) {
  const maxEnergy = Math.max(
    ...services.map(
      (service) =>
        service.periodTotals.energyKwh,
    ),
    0,
  );

  const maxEmissions = Math.max(
    ...services.map(
      (service) =>
        service.periodTotals.emissionsGco2e,
    ),
    0,
  );

  return (
    <section
      className="comparison-summary"
      aria-labelledby="comparison-summary-title"
    >
      <header className="comparison-summary-header">
        <div>
          <p className="analyses-section-label">
            RESUMO COMPARATIVO
          </p>

          <h2 id="comparison-summary-title">
            Indicadores consolidados
          </h2>

          <p>
            Compare impacto e uso de recursos
            dos serviços dentro do período selecionado.
          </p>
        </div>
      </header>

      {/* IMPACTO AMBIENTAL */}
      <section className="comparison-summary-visual">
        <div className="comparison-summary-subheader">
          <div>
            <span>IMPACTO NO PERÍODO</span>

            <p>
              Participação relativa de cada serviço.
            </p>
          </div>
        </div>

        <div className="comparison-impact-grid">
          <ImpactBars
            title="Energia total"
            services={services}
            selectedServiceIds={
              selectedServiceIds
            }
            focusServiceId={
              focusServiceId
            }
            maxValue={maxEnergy}
            getValue={(service) =>
              service.periodTotals.energyKwh
            }
            formatValue={formatEnergy}
            onFocusServiceChange={
              onFocusServiceChange
            }
          />

          <ImpactBars
            title="CO₂e total"
            services={services}
            selectedServiceIds={
              selectedServiceIds
            }
            focusServiceId={
              focusServiceId
            }
            maxValue={maxEmissions}
            getValue={(service) =>
              service.periodTotals.emissionsGco2e
            }
            formatValue={
              formatEmissions
            }
            onFocusServiceChange={
              onFocusServiceChange
            }
          />
        </div>
      </section>

      {/* MATRIZ DE RECURSOS */}
      <section className="comparison-summary-visual">
        <div className="comparison-summary-subheader">
          <div>
            <span>PERFIL DE RECURSOS</span>

            <p>
              Compare rapidamente o comportamento
              operacional dos serviços.
            </p>
          </div>
        </div>

        <div className="comparison-resource-matrix">
          <div className="comparison-resource-matrix-header">
            <span />

            {services.map((service) => (
              <button
                key={service.serviceId}
                type="button"
                className={
                  service.serviceId ===
                  focusServiceId
                    ? "comparison-resource-service is-focused"
                    : "comparison-resource-service"
                }
                onClick={() =>
                  onFocusServiceChange(
                    service.serviceId,
                  )
                }
              >
                <span
                  className="comparison-resource-service-dot"
                  style={{
                    background:
                      getComparisonServiceColor(
                        service.serviceId,
                        selectedServiceIds,
                      ),
                  }}
                />

                {service.name}
              </button>
            ))}
          </div>

          {RESOURCE_METRICS.map(
            (resourceMetric) => {
              const values = services.map(
                (service) =>
                  resourceMetric.getValue(
                    service,
                  ),
              );

              const validValues =
                values.filter(
                  (
                    value,
                  ): value is number =>
                    value !== null,
                );

              const maxValue =
                validValues.length > 0
                  ? Math.max(
                      ...validValues,
                      0,
                    )
                  : 0;

              return (
                <div
                  key={resourceMetric.key}
                  className="comparison-resource-row"
                >
                  <div className="comparison-resource-label">
                    <strong>
                      {resourceMetric.label}
                    </strong>

                    <span>
                      {resourceMetric.unit}
                    </span>
                  </div>

                  {services.map(
                    (service) => {
                      const value =
                        resourceMetric.getValue(
                          service,
                        );

                      const percentage =
                        value !== null &&
                        maxValue > 0
                          ? (value /
                              maxValue) *
                            100
                          : 0;

                      const opacity =
                        getComparisonServiceOpacity(
                          service.serviceId,
                          selectedServiceIds,
                          focusServiceId,
                        );

                      return (
                        <button
                          key={
                            service.serviceId
                          }
                          type="button"
                          className={
                            service.serviceId ===
                            focusServiceId
                              ? "comparison-resource-cell is-focused"
                              : "comparison-resource-cell"
                          }
                          onClick={() =>
                            onFocusServiceChange(
                              service.serviceId,
                            )
                          }
                        >
                          <span className="comparison-resource-cell-track">
                            <span
                              className="comparison-resource-cell-fill"
                              style={{
                                width: `${percentage}%`,
                                background:
                                  getComparisonServiceColor(
                                    service.serviceId,
                                    selectedServiceIds,
                                  ),
                                opacity,
                              }}
                            />
                          </span>

                          <strong>
                            {formatResourceValue(
                              value,
                              resourceMetric.unit,
                            )}
                          </strong>
                        </button>
                      );
                    },
                  )}
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* DETALHES NUMÉRICOS */}
      <section className="comparison-summary-details">
        <div className="comparison-summary-subheader">
          <div>
            <span>DETALHES NUMÉRICOS</span>

            <p>
              Valores consolidados de cada
              serviço no período.
            </p>
          </div>
        </div>

        <div className="comparison-summary-grid">
          {services.map((service) => (
            <article
              key={service.serviceId}
              className={
                service.serviceId ===
                focusServiceId
                  ? "comparison-summary-card is-focused"
                  : "comparison-summary-card"
              }
            >
              <button
                type="button"
                className="comparison-summary-card-header"
                onClick={() =>
                  onFocusServiceChange(
                    service.serviceId,
                  )
                }
              >
                <div>
                  <strong>
                    {service.name}
                  </strong>

                  <span>
                    {
                      service.regionalContext
                        .regionCode
                    }
                  </span>
                </div>

                {service.periodTotals
                  .isPartial && (
                  <span className="comparison-summary-partial">
                    Parcial
                  </span>
                )}
              </button>

              <dl className="comparison-summary-values">
                <div>
                  <dt>Energia total</dt>
                  <dd>
                    {formatEnergy(
                      service.periodTotals
                        .energyKwh,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>CO₂e total</dt>
                  <dd>
                    {formatEmissions(
                      service.periodTotals
                        .emissionsGco2e,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>CPU média</dt>
                  <dd>
                    {formatPercent(
                      service
                        .resourceSummary.cpu
                        .averagePercent,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>CPU pico</dt>
                  <dd>
                    {formatPercent(
                      service
                        .resourceSummary.cpu
                        .peakPercent,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Memória média</dt>
                  <dd>
                    {formatGb(
                      service
                        .resourceSummary.memory
                        .averageGb,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Memória pico</dt>
                  <dd>
                    {formatGb(
                      service
                        .resourceSummary.memory
                        .peakGb,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Disco médio</dt>
                  <dd>
                    {formatGb(
                      service
                        .resourceSummary.disk
                        .averageGb,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Disco pico</dt>
                  <dd>
                    {formatGb(
                      service
                        .resourceSummary.disk
                        .peakGb,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Rede total</dt>
                  <dd>
                    {formatGb(
                      service
                        .resourceSummary.network
                        .totalGb,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Região</dt>
                  <dd>
                    {
                      service.regionalContext
                        .regionCode
                    }
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
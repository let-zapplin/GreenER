import {
  useEffect,
  useState,
} from "react";

import "./EnvironmentOverviewDock.css";

type EnvironmentOverviewDockProps = {
  energyKwh: number | null;
  emissionsGco2e: number | null;

  activeServiceCount: number;
  noMetricsServiceCount: number;
  unavailableServiceCount: number;

  isPartial: boolean;

  loading: boolean;
  error: string | null;
};

const STORAGE_KEY =
  "greener-monitoring-environment-dock-collapsed";

function formatValue(
  value: number | null,
  maximumFractionDigits = 6,
) {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits,
    },
  );
}

export function EnvironmentOverviewDock({
  energyKwh,
  emissionsGco2e,

  activeServiceCount,
  noMetricsServiceCount,
  unavailableServiceCount,

  isPartial,

  loading,
  error,
}: EnvironmentOverviewDockProps) {
  const [isCollapsed, setIsCollapsed] =
    useState(() => {
      return (
        localStorage.getItem(
          STORAGE_KEY,
        ) === "true"
      );
    });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      String(isCollapsed),
    );
  }, [isCollapsed]);

  const monitoredServiceCount =
    activeServiceCount +
    noMetricsServiceCount +
    unavailableServiceCount;

  return (
    <section
      className={`environment-overview-dock ${
        isCollapsed
          ? "is-collapsed"
          : ""
      }`}
      aria-label="Resumo ambiental das últimas 24 horas"
    >
      <div className="environment-overview-dock-header">
        <div className="environment-overview-dock-title">
          <span className="environment-overview-dock-eyebrow">
            AMBIENTE · 24H
          </span>

          {!isCollapsed && (
            <strong>
              Indicadores do ambiente
            </strong>
          )}
        </div>

        {isCollapsed && (
          <div className="environment-overview-dock-compact">
            <span>
              <strong>
                {formatValue(
                  energyKwh,
                )}
              </strong>{" "}
              kWh
            </span>

            <span aria-hidden="true">
              ·
            </span>

            <span>
              <strong>
                {formatValue(
                  emissionsGco2e,
                )}
              </strong>{" "}
              gCO₂e
            </span>

            <span aria-hidden="true">
              ·
            </span>

            <span>
              <strong>
                {
                  monitoredServiceCount
                }
              </strong>{" "}
              serviços
            </span>
          </div>
        )}

        <div className="environment-overview-dock-actions">
          {isPartial && (
            <span className="environment-overview-dock-partial">
              Dados parciais
            </span>
          )}

          {loading && (
            <span
              className="environment-overview-dock-sync"
              title="Atualizando indicadores"
              aria-label="Atualizando indicadores"
            />
          )}

          <button
            type="button"
            className="environment-overview-dock-toggle"
            onClick={() =>
              setIsCollapsed(
                (current) =>
                  !current,
              )
            }
            aria-expanded={
              !isCollapsed
            }
            title={
              isCollapsed
                ? "Expandir indicadores"
                : "Minimizar indicadores"
            }
          >
            {isCollapsed
              ? "+"
              : "−"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="environment-overview-dock-grid">
            <div className="environment-overview-stat">
              <span>
                Consumo energético
              </span>

              <div>
                <strong>
                  {formatValue(
                    energyKwh,
                  )}
                </strong>

                <small>kWh</small>
              </div>
            </div>

            <div className="environment-overview-stat">
              <span>
                Emissões estimadas
              </span>

              <div>
                <strong>
                  {formatValue(
                    emissionsGco2e,
                  )}
                </strong>

                <small>
                  gCO₂e
                </small>
              </div>
            </div>

            <div className="environment-overview-stat">
              <span>
                Serviços monitorados
              </span>

              <div>
                <strong>
                  {
                    monitoredServiceCount
                  }
                </strong>

                <small>
                  serviços
                </small>
              </div>
            </div>
          </div>

          <div className="environment-overview-dock-status">
            <span className="active">
              <i />
              {
                activeServiceCount
              }{" "}
              ativos
            </span>

            {noMetricsServiceCount >
              0 && (
              <span className="no-metrics">
                <i />
                {
                  noMetricsServiceCount
                }{" "}
                sem métricas
              </span>
            )}

            {unavailableServiceCount >
              0 && (
              <span className="unavailable">
                <i />
                {
                  unavailableServiceCount
                }{" "}
                indisponíveis
              </span>
            )}

            {error && (
              <span className="environment-overview-dock-error">
                Atualização temporariamente
                indisponível
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
import { useEffect, useState } from "react";
import { HistoryChart } from "../components/HistoryChart";
import { useMonitoring } from "../hooks/useMonitoring";
import { useServiceIndicatorHistory } from "../hooks/useServiceIndicatorHistory";

import "./Analyses.css";
type HistoryPeriod = {
  label: string;
  value: number;
};

const HISTORY_PERIODS: HistoryPeriod[] = [
  {
    label: "1h",
    value: 1 * 60 * 60 * 1000,
  },
  {
    label: "6h",
    value: 6 * 60 * 60 * 1000,
  },
  {
    label: "24h",
    value: 24 * 60 * 60 * 1000,
  },
  {
    label: "7d",
    value: 7 * 24 * 60 * 60 * 1000,
  },
];

const DEFAULT_HISTORY_PERIOD_MS = 24 * 60 * 60 * 1000;

function getServiceInitials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

export function Analyses() {
  const {
    snapshot,
    loading: servicesLoading,
    error: servicesError,
  } = useMonitoring();

  const { services } = snapshot;

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null,
  );

  const [historyPeriodMs, setHistoryPeriodMs] = useState(
    DEFAULT_HISTORY_PERIOD_MS,
  );

  const [isChartTransitioning, setIsChartTransitioning] = useState(false);

  useEffect(() => {
    if (services.length === 0) {
      setSelectedServiceId(null);
      return;
    }

    setSelectedServiceId((currentServiceId) => {
      const currentServiceStillExists =
        currentServiceId !== null &&
        services.some((service) => service.serviceId === currentServiceId);

      if (currentServiceStillExists) {
        return currentServiceId;
      }

      return services[0].serviceId;
    });
  }, [services]);

  useEffect(() => {
    if (selectedServiceId === null) {
      return;
    }

    setIsChartTransitioning(true);

    const timeoutId = window.setTimeout(() => {
      setIsChartTransitioning(false);
    }, 750);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedServiceId, historyPeriodMs]);

  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ?? null;

  const selectedServiceIndex = services.findIndex(
    (service) => service.serviceId === selectedServiceId,
  );

  function selectPreviousService() {
    if (services.length === 0 || selectedServiceIndex < 0) {
      return;
    }

    const previousIndex =
      selectedServiceIndex === 0
        ? services.length - 1
        : selectedServiceIndex - 1;

    setSelectedServiceId(services[previousIndex].serviceId);
  }

  function selectNextService() {
    if (services.length === 0 || selectedServiceIndex < 0) {
      return;
    }

    const nextIndex =
      selectedServiceIndex === services.length - 1
        ? 0
        : selectedServiceIndex + 1;

    setSelectedServiceId(services[nextIndex].serviceId);
  }

  const {
    history,
    loading: historyLoading,
    error: historyError,
  } = useServiceIndicatorHistory(selectedServiceId, historyPeriodMs);

  const [previousHistory, setPreviousHistory] = useState<typeof history>(null);

  useEffect(() => {
    if (history) {
      setPreviousHistory(history);
    }
  }, [history]);

  const visibleHistory = history ?? (historyLoading ? previousHistory : null);

  const validEnergySamples =
    visibleHistory?.samples.filter((sample) => sample.energyKwh !== null)
      .length ?? 0;

  return (
    <div className="analyses-screen">
      <main className="analyses-page">
        <header className="analyses-header">
          <p className="analyses-eyebrow">ANÁLISE TEMPORAL</p>

          <h1>
            Histórico <span>ambiental.</span>
          </h1>

          <p className="analyses-description">
            Acompanhe como o impacto ambiental dos serviços evolui ao longo do
            tempo a partir das coletas realizadas pelo GreenER.
          </p>
        </header>

        <section
          className="analyses-controls"
          aria-labelledby="analysis-service-title"
        >
          <div>
            <p className="analyses-section-label">SERVIÇO ANALISADO</p>

            <h2 id="analysis-service-title">Selecione um serviço</h2>
          </div>

          <label className="analyses-service-select">
            <span>Serviço</span>

            <select
              value={selectedServiceId ?? ""}
              onChange={(event) =>
                setSelectedServiceId(Number(event.target.value))
              }
              disabled={servicesLoading && services.length === 0}
            >
              {services.length === 0 && (
                <option value="">Nenhum serviço disponível</option>
              )}

              {services.map((service) => (
                <option key={service.serviceId} value={service.serviceId}>
                  {service.name} · {service.location.region_code}
                </option>
              ))}
            </select>
          </label>
        </section>

        {servicesLoading && services.length === 0 && (
          <section className="analyses-state" role="status">
            <span className="analyses-loader" aria-hidden="true" />
            <h2>Buscando serviços</h2>
            <p>Estamos carregando os serviços disponíveis para análise.</p>
          </section>
        )}

        {servicesError && services.length === 0 && (
          <section className="analyses-state analyses-state-error" role="alert">
            <h2>Não foi possível carregar os serviços</h2>
            <p>{servicesError}</p>
          </section>
        )}

        {!servicesLoading && !servicesError && services.length === 0 && (
          <section className="analyses-state" role="status">
            <h2>Nenhum serviço disponível</h2>
            <p>
              O histórico poderá ser analisado assim que serviços forem
              identificados pelo GreenER.
            </p>
          </section>
        )}

        {selectedService && (
          <section className="analyses-history" aria-labelledby="history-title">
            <div className="analyses-history-corner-nav">
              <button
                type="button"
                className="analyses-service-corner-button is-previous"
                onClick={selectPreviousService}
                aria-label="Serviço anterior"
                title="Serviço anterior"
              >
                <span aria-hidden="true" />
              </button>

              <button
                type="button"
                className="analyses-service-corner-button is-next"
                onClick={selectNextService}
                aria-label="Próximo serviço"
                title="Próximo serviço"
              >
                <span aria-hidden="true" />
              </button>
            </div>
            <div className="analyses-history-header">
              <div
                key={selectedServiceId}
                className="analyses-history-identity"
              >
                <div className="analyses-service-badge" aria-hidden="true">
                  {getServiceInitials(selectedService.name)}
                </div>

                <div>
                  <p className="analyses-section-label">HISTÓRICO AMBIENTAL</p>

                  <h2 id="history-title">Energia estimada</h2>

                  <p className="analyses-history-service">
                    <strong>{selectedService.name}</strong>
                    <span aria-hidden="true">{" · "}</span>
                    {selectedService.location.region_code}
                  </p>
                </div>
              </div>

              <div className="analyses-history-unit">
                <span>Unidade</span>
                <strong>kWh</strong>
              </div>
            </div>

            <div
              className="analyses-period-selector"
              aria-label="Período analisado"
            >
              <span>Período</span>

              <div className="analyses-period-options">
                {HISTORY_PERIODS.map((period) => {
                  const isActive = historyPeriodMs === period.value;

                  return (
                    <button
                      key={period.label}
                      type="button"
                      className={
                        isActive
                          ? "analyses-period-button is-active"
                          : "analyses-period-button"
                      }
                      aria-pressed={isActive}
                      onClick={() => setHistoryPeriodMs(period.value)}
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {servicesError && (
              <div className="analyses-warning" role="status">
                A lista de serviços pode estar desatualizada. Estamos usando a
                última consulta disponível.
              </div>
            )}

            <div className="analyses-history-content">
              <div
                key={`${selectedServiceId}-${historyPeriodMs}`}
                className={
                  isChartTransitioning
                    ? "analyses-chameleon-transition is-active"
                    : "analyses-chameleon-transition"
                }
                aria-hidden="true"
              >
                <div className="analyses-transition-glow" />

                <div className="analyses-transition-fragments">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              {historyError && !history && (
                <div
                  className="analyses-history-state analyses-state-error"
                  role="alert"
                >
                  <h3>Não foi possível carregar o histórico</h3>
                  <p>{historyError}</p>
                </div>
              )}

              {historyError && history && (
                <div className="analyses-warning" role="status">
                  Não foi possível atualizar o histórico. Os últimos dados
                  carregados permanecem visíveis.
                </div>
              )}

              {visibleHistory && (
                <>
                  <dl className="analyses-history-summary">
                    <div>
                      <dt>Coletas no período</dt>
                      <dd>{visibleHistory.samples.length}</dd>
                    </div>

                    <div>
                      <dt>Com energia calculada</dt>
                      <dd>{validEnergySamples}</dd>
                    </div>

                    <div>
                      <dt>Período</dt>
                      <dd>
                        {new Date(visibleHistory.period.start).toLocaleString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                        {" — "}
                        {new Date(visibleHistory.period.end).toLocaleString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </dd>
                    </div>
                  </dl>

                  {visibleHistory.samples.length === 0 && (
                    <div className="analyses-history-state" role="status">
                      <h3>Sem histórico neste período</h3>
                      <p>
                        Ainda não existem coletas registradas para este serviço
                        nas últimas 24 horas.
                      </p>
                    </div>
                  )}

                  {visibleHistory.samples.length > 0 &&
                    validEnergySamples === 0 && (
                      <div className="analyses-history-state" role="status">
                        <h3>Energia ainda indisponível</h3>
                        <p>
                          Existem coletas no período, mas nenhuma possui dados
                          suficientes para calcular o consumo energético.
                        </p>
                      </div>
                    )}

                  {visibleHistory.samples.length > 0 &&
                    validEnergySamples > 0 && (
                      <HistoryChart
                        key={`${visibleHistory.service.serviceId}-${visibleHistory.period.start}-${visibleHistory.period.end}`}
                        samples={visibleHistory.samples}
                        periodStart={visibleHistory.period.start}
                        periodEnd={visibleHistory.period.end}
                        collectionIntervalMs={
                          visibleHistory.period.collectionIntervalMs
                        }
                        displayIntervalMs={
                          visibleHistory.period.displayIntervalMs
                        }
                      />
                    )}
                </>
              )}
            </div>
          </section>
        )}
      </main>

      <div className="analyses-waves" aria-hidden="true" />
    </div>
  );
}

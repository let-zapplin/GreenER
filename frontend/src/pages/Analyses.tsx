import { useEffect, useState } from "react";
import { HistoryChart } from "../components/HistoryChart";
import { useMonitoring } from "../hooks/useMonitoring";
import { useServiceIndicatorHistory } from "../hooks/useServiceIndicatorHistory";

import "./Analyses.css";

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

  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ?? null;

  const {
    history,
    loading: historyLoading,
    error: historyError,
  } = useServiceIndicatorHistory(selectedServiceId);

  const validEnergySamples =
    history?.samples.filter((sample) => sample.energyKwh !== null).length ?? 0;

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
            <div className="analyses-history-header">
              <div>
                <p className="analyses-section-label">ÚLTIMAS 24 HORAS</p>

                <h2 id="history-title">Energia estimada</h2>

                <p className="analyses-history-service">
                  {selectedService.name}
                  <span aria-hidden="true"> · </span>
                  {selectedService.location.region_code}
                </p>
              </div>

              <div className="analyses-history-unit">
                <span>Unidade</span>
                <strong>kWh</strong>
              </div>
            </div>

            {servicesError && (
              <div className="analyses-warning" role="status">
                A lista de serviços pode estar desatualizada. Estamos usando a
                última consulta disponível.
              </div>
            )}

            {historyLoading && !history && (
              <div className="analyses-history-state" role="status">
                <span className="analyses-loader" aria-hidden="true" />
                <p>Carregando histórico ambiental...</p>
              </div>
            )}

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

            {history && (
              <>
                <dl className="analyses-history-summary">
                  <div>
                    <dt>Coletas no período</dt>
                    <dd>{history.samples.length}</dd>
                  </div>

                  <div>
                    <dt>Com energia calculada</dt>
                    <dd>{validEnergySamples}</dd>
                  </div>

                  <div>
                    <dt>Período</dt>
                    <dd>
                      {new Date(history.period.start).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" — "}
                      {new Date(history.period.end).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                </dl>

                {history.samples.length === 0 && (
                  <div className="analyses-history-state" role="status">
                    <h3>Sem histórico neste período</h3>
                    <p>
                      Ainda não existem coletas registradas para este serviço
                      nas últimas 24 horas.
                    </p>
                  </div>
                )}

                {history.samples.length > 0 && validEnergySamples === 0 && (
                  <div className="analyses-history-state" role="status">
                    <h3>Energia ainda indisponível</h3>
                    <p>
                      Existem coletas no período, mas nenhuma possui dados
                      suficientes para calcular o consumo energético.
                    </p>
                  </div>
                )}

                {history.samples.length > 0 && validEnergySamples > 0 && (
                  <HistoryChart samples={history.samples} />
                )}
              </>
            )}
          </section>
        )}
      </main>

      <div className="analyses-waves" aria-hidden="true" />
    </div>
  );
}

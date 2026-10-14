import { useEffect, useState } from "react";
import { ServiceList } from "../components/ServiceList";
import { ServiceIndicator } from "../components/ServiceIndicator";
import { discoverServices } from "../services/serviceApi";
import { getMonitoringSnapshot, recordDiscovery } from "../services/monitoringState";
import "./Monitoring.css";

const REFRESH_INTERVAL_MS = 1_000;
// Allows the backend's default/example upstream timeout (5/10s) to complete.
const REQUEST_TIMEOUT_MS = 15_000;

export function Monitoring() {
  const [snapshot, setSnapshot] = useState(getMonitoringSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ id: string; key: number } | null>(null);
  const { services, lastUpdated } = snapshot;
  const activeCount = services.filter((service) => service.status !== "unavailable").length;
  const stale = lastUpdated !== null && error !== null;
  const unavailableCount = services.length - activeCount;

  useEffect(() => {
    if (!selection) return;
    function deselectOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".service-card.is-selected, button.service-indicator")) return;
      setSelection(null);
    }
    function deselectOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelection(null);
    }
    document.addEventListener("pointerdown", deselectOutside);
    document.addEventListener("keydown", deselectOnEscape);
    return () => {
      document.removeEventListener("pointerdown", deselectOutside);
      document.removeEventListener("keydown", deselectOnEscape);
    };
  }, [selection]);

  useEffect(() => {
    let disposed = false;
    let requestInFlight = false;
    let controller: AbortController | null = null;

    async function loadServices() {
      if (disposed || requestInFlight) return;
      requestInFlight = true;
      const requestController = new AbortController();
      controller = requestController;
      const requestTimeout = setTimeout(() => requestController.abort(), REQUEST_TIMEOUT_MS);
      try {
        const data = await discoverServices(requestController.signal);
        if (disposed) return;
        setSnapshot(recordDiscovery(data.services));
        setError(null);
      } catch (error) {
        if (disposed) return;
        console.error("[Monitoring] Falha ao carregar serviços:", error);
        setError(requestController.signal.aborted
          ? "A consulta excedeu o tempo de espera"
          : "Erro ao carregar os serviços");
      } finally {
        clearTimeout(requestTimeout);
        requestInFlight = false;
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadServices();
    const refreshTimer = setInterval(() => void loadServices(), REFRESH_INTERVAL_MS);
    return () => {
      disposed = true;
      clearInterval(refreshTimer);
      controller?.abort();
    };
  }, []);

  return (
    <main className="monitoring-page">
      <section className="monitoring-header">
        <div className="monitoring-intro">
          <p className="monitoring-eyebrow">SEU AMBIENTE, EM UM SÓ LUGAR</p>
          <h1>Monitoramento de <span>serviços.</span></h1>
          <p className="monitoring-description">Acompanhe os serviços descobertos, sua localização e as mudanças no seu ambiente.</p>
        </div>
        <details className={`monitoring-sync ${error ? "has-error" : ""}`}>
          <summary className="monitoring-sync-label"><span aria-hidden="true" className="monitoring-sync-dot" />
            {error ? "Atualização interrompida" : loading ? "Atualizando serviços" : "Ultima Atualização"}
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg>
          </summary>
          {lastUpdated ? (
            <span className="refresh-note">Última consulta bem-sucedida<br />
              <time dateTime={lastUpdated}>{new Date(lastUpdated).toLocaleString("pt-BR")}</time>
            </span>
          ) : <span className="refresh-note">Aguardando a primeira consulta</span>}
        </details>
      </section>
      {error && (
        <div className="monitoring-stale" role="alert">
          <strong>{error}</strong>
          <p>{stale ? "Os dados abaixo são da última consulta bem-sucedida. " : ""}Uma nova tentativa será feita automaticamente.</p>
        </div>
      )}
      {loading && services.length === 0 && (
        <div className="monitoring-empty" role="status"><span className="monitoring-loader" aria-hidden="true" /><h2>Buscando serviços</h2><p>Estamos consultando os serviços disponíveis no seu ambiente.</p></div>
      )}
      {!loading && !error && services.length === 0 && (
        <div className="monitoring-empty" role="status"><h2>Nenhum serviço encontrado</h2><p>Os serviços aparecerão aqui assim que forem identificados. A consulta continua automaticamente.</p></div>
      )}
      {services.length > 0 && (
        <>
          <section className="services-summary" aria-labelledby="services-summary-title">
            <div className="services-summary-info">
              <p className="monitoring-section-label">VISÃO GERAL</p>
              <h2 id="services-summary-title">Seu ambiente agora</h2>
              <div className="services-total"><strong>{activeCount}</strong><span>de {services.length} serviços<br />{stale ? "ativos na última consulta" : "ativos na descoberta"}</span></div>
              <dl className="services-counts">
                <div><dt>Detectados</dt><dd>{services.length}</dd></div>
                <div className="services-count-active"><dt>Ativos</dt><dd>{activeCount}</dd></div>
                <div className="services-count-unavailable"><dt>Indisponíveis</dt><dd>{unavailableCount}</dd></div>
              </dl>
            </div>
            <div className="services-overview">
              <div className="services-overview-heading"><h3>Status dos serviços</h3><span>{services.length} identificados</span></div>
              <div className="services-summary-grid">
                {services.map((service) => <ServiceIndicator key={service.id} service={service}
                  onSelect={(id) => setSelection((previous) => ({ id, key: (previous?.key ?? 0) + 1 }))} />)}
              </div>
              <ul className="services-legend" aria-label="Legenda dos status">
                <li><span className="service-indicator active" aria-hidden="true" />Ativo</li>
                <li><span className="service-indicator new" aria-hidden="true" />Novo</li>
                <li><span className="service-indicator returned" aria-hidden="true" />Retornou</li>
                <li><span className="service-indicator unavailable" aria-hidden="true" />Indisponível</li>
              </ul>
              <p className="services-overview-note">Selecione um indicador para ver os detalhes.</p>
            </div>
          </section>
          <div className="monitoring-list-heading"><div><p className="monitoring-section-label">SERVIÇOS</p><h2 id="service-list-title">Detalhes do ambiente</h2></div><span>{services.length} {services.length === 1 ? "serviço" : "serviços"}</span></div>
          <ServiceList services={services} selection={selection} />
        </>
      )}
    </main>
  );
}

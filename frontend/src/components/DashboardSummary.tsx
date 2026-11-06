import type { DashboardResponse } from "../types/dashboard";
import { DashboardMetricCard } from "./DashboardMetricCard";

import "./DashboardSummary.css";

function formatMetric(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

type DashboardSummaryProps = {
  dashboard: DashboardResponse | null;
  loading: boolean;
  error: string | null;
};
export function DashboardSummary({
  dashboard,
  loading,
  error,
}: DashboardSummaryProps) {
  if (loading && !dashboard) {
    return (
      <section className="dashboard-summary" aria-busy="true">
        <div className="dashboard-summary-heading">
          <p className="monitoring-section-label">INDICADORES DO AMBIENTE</p>
          <h2>Últimas 24 horas</h2>
        </div>

        <div className="dashboard-summary-grid">
          <div className="dashboard-card dashboard-card-loading" />
          <div className="dashboard-card dashboard-card-loading" />
          <div className="dashboard-card dashboard-card-loading" />
        </div>
      </section>
    );
  }

  if (error && !dashboard) {
    return (
      <section className="dashboard-summary">
        <div className="dashboard-summary-state" role="alert">
          <strong>Não foi possível carregar os indicadores.</strong>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="dashboard-summary">
        <div className="dashboard-summary-state">
          <strong>Indicadores ainda não disponíveis.</strong>

          <p>
            Os dados aparecerão assim que o ambiente concluir as primeiras
            coletas.
          </p>
        </div>
      </section>
    );
  }

  const {
    energyKwh,
    emissionsGco2e,
    activeServiceCount,
    noMetricsServiceCount,
    unavailableServiceCount,
    isPartial,
  } = dashboard.summary;

  const monitoredServiceCount =
    activeServiceCount + noMetricsServiceCount + unavailableServiceCount;

  if (monitoredServiceCount === 0) {
    return (
      <section className="dashboard-summary">
        <div className="dashboard-summary-state">
          <strong>Nenhum serviço monitorado.</strong>
          <p>
            Os indicadores aparecerão quando houver serviços com dados
            disponíveis.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="dashboard-summary"
      aria-labelledby="dashboard-summary-title"
    >
      <div className="dashboard-summary-heading">
        <div>
          <p className="monitoring-section-label">INDICADORES DO AMBIENTE</p>

          <h2 id="dashboard-summary-title">Últimas 24 horas</h2>
        </div>

        {isPartial && (
          <span
            className="dashboard-partial"
            title="Nem todas as amostras do período contribuíram integralmente para os indicadores."
          >
            Dados parciais
          </span>
        )}
      </div>

      {error && (
        <div className="dashboard-summary-warning" role="status">
          <strong> Atualização temporariamente indisponível.</strong>
          <span>
            {" "}
            Os últimos indicadores válidos continuam sendo exibidos. Uma nova
            tentativa será feita automaticamente.
          </span>
        </div>
        
      )}
      <div className="dashboard-summary-grid">
        <DashboardMetricCard
          label="Consumo energético"
          value={formatMetric(energyKwh)}
          unit="kWh"
          description="Total estimado do ambiente"
          variant="energy"
        />

        <DashboardMetricCard
          label="Emissões estimadas"
          value={formatMetric(emissionsGco2e)}
          unit="gCO₂e"
          description="Total estimado do ambiente"
          variant="emissions"
        />

        <article className="dashboard-card dashboard-card-services">
          <span className="dashboard-card-label">Serviços monitorados</span>

          <strong className="dashboard-card-value">
            {monitoredServiceCount}
          </strong>

          <span className="dashboard-card-unit">
            {monitoredServiceCount === 1 ? "serviço" : "serviços"}
          </span>

          <div className="dashboard-service-status">
            <span>{activeServiceCount} operando normalmente</span>

            {noMetricsServiceCount > 0 && (
              <span>{noMetricsServiceCount} sem métricas</span>
            )}

            {unavailableServiceCount > 0 && (
              <span>{unavailableServiceCount} indisponíveis</span>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

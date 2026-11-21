import type { ComparisonMetric } from "../types/comparison";
import { COMPARISON_METRICS } from "../lib/comparisonMetrics";
import "./ComparisonMetricSelector.css";

type ComparisonMetricSelectorProps = {
  metric: ComparisonMetric;
  onMetricChange: (metric: ComparisonMetric) => void;
};


export function ComparisonMetricSelector({
  metric,
  onMetricChange,
}: ComparisonMetricSelectorProps) {
  return (
    <section className="comparison-metric-selector">
      <div>
        <p className="analyses-section-label">
          DIMENSÃO DA COMPARAÇÃO
        </p>

        <h2>O que você deseja comparar?</h2>

        <p>
          Escolha uma métrica para comparar todos os serviços
          selecionados usando a mesma unidade.
        </p>
      </div>

      <div
        className="comparison-metric-options"
        aria-label="Métrica da comparação"
      >
       {COMPARISON_METRICS.map((option) => {
          const isActive = metric === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={
                isActive
                  ? "comparison-metric-option is-active"
                  : "comparison-metric-option"
              }
              aria-pressed={isActive}
              onClick={() =>
                onMetricChange(option.value)
              }
            >
              <strong>{option.label}</strong>

              <span>{option.unit}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
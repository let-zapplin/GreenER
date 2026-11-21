import "./RedistributionImpactSummary.css";

type RedistributionImpactSummaryProps = {
  observedEmissionsGco2e: number | null;
  projectedEmissionsGco2e: number | null;
  differencePercent: number | null;
  comparableServiceCount: number;
  totalServiceCount: number;
};

function formatEmissions(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RedistributionImpactSummary({
  observedEmissionsGco2e,
  projectedEmissionsGco2e,
  differencePercent,
  comparableServiceCount,
  totalServiceCount,
}: RedistributionImpactSummaryProps) {
  const isReduction =
    differencePercent !== null && differencePercent < 0;

  const isIncrease =
    differencePercent !== null && differencePercent > 0;

  return (
    <section
      className="redistribution-impact"
      aria-labelledby="redistribution-impact-title"
    >
      <header className="redistribution-impact-header">
        <div>
          <p className="analyses-section-label">
            IMPACTO ESTIMADO
          </p>

          <h3 id="redistribution-impact-title">
            Efeito ambiental da redistribuição
          </h3>
        </div>

        <span>
          {comparableServiceCount} de {totalServiceCount} serviços comparáveis
        </span>
      </header>

      <div className="redistribution-impact-flow">
        <article className="redistribution-impact-value">
          <span>Emissão observada</span>

          <strong>
            {formatEmissions(observedEmissionsGco2e)}
          </strong>

          <small>gCO₂e</small>
        </article>

        <div
          className="redistribution-impact-arrow"
          aria-hidden="true"
        >
          <span />
          <strong>→</strong>
          <span />
        </div>

        <article className="redistribution-impact-value is-projected">
          <span>Emissão projetada</span>

          <strong>
            {formatEmissions(projectedEmissionsGco2e)}
          </strong>

          <small>gCO₂e</small>
        </article>

        <article
          className={
            isReduction
              ? "redistribution-impact-change is-reduction"
              : isIncrease
                ? "redistribution-impact-change is-increase"
                : "redistribution-impact-change"
          }
        >
          <span>
            {isReduction
              ? "Redução estimada"
              : isIncrease
                ? "Aumento estimado"
                : "Variação estimada"}
          </span>

          <strong>
            {isReduction && "↓ "}
            {isIncrease && "↑ "}
            {formatPercent(differencePercent)}%
          </strong>

          <small>
            em relação às emissões observadas
          </small>
        </article>
      </div>
    </section>
  );
}
import type {
  LocationProjectionResponse,
  LocationProjectionScenario,
} from "../types/projection";

import "./LocationProjectionSummary.css";

type LocationProjectionSummaryProps = {
  projection: LocationProjectionResponse;
};

function formatEmissions(
  value: number | null,
): string {
  if (value === null) {
    return "Indisponível";
  }

  if (value < 1) {
    return `${value.toFixed(4)} gCO₂e`;
  }

  return `${value.toFixed(2)} gCO₂e`;
}

function formatDifference(
  scenario: LocationProjectionScenario,
): string {
  if (
    scenario.isCurrent ||
    scenario.differencePercent === null
  ) {
    return "Referência";
  }

  const signal =
    scenario.differencePercent > 0
      ? "+"
      : "";

  return `${signal}${scenario.differencePercent.toFixed(1)}%`;
}

export function LocationProjectionSummary({
  projection,
}: LocationProjectionSummaryProps) {
  return (
    <section
      className="location-projection-summary"
      aria-labelledby="projection-summary-title"
    >
      <div className="location-projection-summary-header">
        <div>
          <p className="analyses-section-label">
            CENÁRIOS PROJETADOS
          </p>

          <h2 id="projection-summary-title">
            Impacto por localização
          </h2>

          <p>
            Todos os cenários utilizam o mesmo consumo
            energético observado no período.
          </p>
        </div>

        <div className="location-projection-energy">
          <span>Energia de referência</span>

          <strong>
            {projection.energyKwh !== null
              ? `${projection.energyKwh.toFixed(6)} kWh`
              : "Indisponível"}
          </strong>
        </div>
      </div>

      {projection.isPartial && (
        <div
          className="location-projection-warning"
          role="status"
        >
          A projeção utiliza dados parciais do período.
          Algumas coletas não possuíam energia calculável.
        </div>
      )}

      <div className="location-projection-grid">
        {projection.scenarios.map(
          (scenario) => (
            <article
              key={scenario.regionCode}
              className={
                scenario.isCurrent
                  ? "location-projection-card is-current"
                  : "location-projection-card"
              }
            >
              <div className="location-projection-card-header">
                <div>
                  <span>
                    {scenario.isCurrent
                      ? "LOCALIZAÇÃO ATUAL"
                      : "CENÁRIO PROJETADO"}
                  </span>

                  <strong>
                    {scenario.region}
                  </strong>

                  <small>
                    {scenario.country}
                  </small>
                </div>

                <span
                  className={
                    scenario.isCurrent
                      ? "location-projection-difference is-reference"
                      : scenario.differencePercent !==
                            null &&
                          scenario.differencePercent < 0
                        ? "location-projection-difference is-positive"
                        : "location-projection-difference is-negative"
                  }
                >
                  {formatDifference(
                    scenario,
                  )}
                </span>
              </div>

              <div className="location-projection-emissions">
                <span>Emissão estimada</span>

                <strong>
                  {formatEmissions(
                    scenario.projectedEmissionsGco2e,
                  )}
                </strong>
              </div>

              <dl className="location-projection-details">
                <div>
                  <dt>Intensidade</dt>

                  <dd>
                    {
                      scenario.carbonIntensityGco2ePerKwh
                    }{" "}
                    gCO₂e/kWh
                  </dd>
                </div>

                <div>
                  <dt>Renovável</dt>

                  <dd>
                    {
                      scenario.renewableSharePercent
                    }
                    %
                  </dd>
                </div>
              </dl>
            </article>
          ),
        )}
      </div>

      {projection.unavailableRegionCodes.length >
        0 && (
        <div
          className="location-projection-warning"
          role="status"
        >
          Algumas localidades não possuem intensidade
          ambiental disponível:{" "}
          {projection.unavailableRegionCodes.join(
            ", ",
          )}
          .
        </div>
      )}
    </section>
  );
}
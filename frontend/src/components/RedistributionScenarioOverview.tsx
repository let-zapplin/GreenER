import "./RedistributionScenarioOverview.css";

type RegionDistribution = {
  regionCode: string;
  serviceCount: number;
  carbonIntensityGco2ePerKwh: number | null;
};

type RedistributionScenarioOverviewProps = {
  currentDistribution: RegionDistribution[];
  suggestedDistribution: RegionDistribution[];
};

function renderServiceDots(serviceCount: number) {
  return Array.from(
    { length: serviceCount },
    (_, index) => (
      <span
        key={index}
        className="redistribution-scenario-dot"
        aria-hidden="true"
      />
    ),
  );
}

export function RedistributionScenarioOverview({
  currentDistribution,
  suggestedDistribution,
}: RedistributionScenarioOverviewProps) {
  return (
    <section
      className="redistribution-scenario"
      aria-labelledby="redistribution-scenario-title"
    >
      <header className="redistribution-scenario-header">
        <div>
          <p className="analyses-section-label">
            VISÃO DA REDISTRIBUIÇÃO
          </p>

          <h3 id="redistribution-scenario-title">
            Como os serviços foram realocados
          </h3>

          <p>
            Compare a ocupação atual das regiões com o cenário sugerido
            pelo GreenER.
          </p>
        </div>
      </header>

      <div className="redistribution-scenario-flow">
        <div className="redistribution-scenario-panel">
          <div className="redistribution-scenario-panel-header">
            <span>01</span>

            <div>
              <strong>Estado atual</strong>
              <small>Distribuição observada</small>
            </div>
          </div>

          <div className="redistribution-scenario-regions">
            {currentDistribution.map((region) => (
              <article
                key={region.regionCode}
                className="redistribution-scenario-region"
              >
                <div className="redistribution-scenario-region-header">
                  <strong>{region.regionCode}</strong>

                  <span>
                    {region.carbonIntensityGco2ePerKwh === null
                      ? "Intensidade indisponível"
                      : `${region.carbonIntensityGco2ePerKwh.toLocaleString(
                          "pt-BR",
                        )} gCO₂e/kWh`}
                  </span>
                </div>

                <div className="redistribution-scenario-dots">
                  {renderServiceDots(region.serviceCount)}
                </div>

                <small>
                  {region.serviceCount}{" "}
                  {region.serviceCount === 1
                    ? "serviço"
                    : "serviços"}
                </small>
              </article>
            ))}
          </div>
        </div>

        <div
          className="redistribution-scenario-process"
          aria-hidden="true"
        >
          <span className="redistribution-scenario-process-line" />

          <div className="redistribution-scenario-process-card">
            <span>GreenER</span>

            <strong>Otimização</strong>

            <small>
              Energia observada × intensidade regional
            </small>
          </div>

          <span className="redistribution-scenario-process-line" />
        </div>

        <div className="redistribution-scenario-panel is-suggested">
          <div className="redistribution-scenario-panel-header">
            <span>02</span>

            <div>
              <strong>Cenário sugerido</strong>
              <small>Redistribuição estimada</small>
            </div>
          </div>

          <div className="redistribution-scenario-regions">
            {suggestedDistribution.map((region) => (
              <article
                key={region.regionCode}
                className="redistribution-scenario-region is-suggested"
              >
                <div className="redistribution-scenario-region-header">
                  <strong>{region.regionCode}</strong>

                  <span>
                    {region.carbonIntensityGco2ePerKwh === null
                      ? "Intensidade indisponível"
                      : `${region.carbonIntensityGco2ePerKwh.toLocaleString(
                          "pt-BR",
                        )} gCO₂e/kWh`}
                  </span>
                </div>

                <div className="redistribution-scenario-dots">
                  {renderServiceDots(region.serviceCount)}
                </div>

                <small>
                  {region.serviceCount}{" "}
                  {region.serviceCount === 1
                    ? "serviço"
                    : "serviços"}
                </small>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
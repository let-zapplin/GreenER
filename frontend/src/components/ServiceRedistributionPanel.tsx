import { useEffect, useMemo, useState } from "react";

import { useServiceRedistribution } from "../hooks/useServiceRedistribution";
import {
  calculateEmissionDifferencePercent,
  calculateRedistributionEmissionSubtotal,
  hasComparableEmissionCoverage,
} from "../lib/redistributionEmissions";

import { RedistributionScenarioOverview } from "./RedistributionScenarioOverview";
import { RedistributionImpactSummary } from "./RedistributionImpactSummary";

import type { AnalysisPeriodWindow } from "../services/analysisPeriod";
import type { ServiceRedistributionPolicy } from "../types/projection";

import "./ServiceRedistributionPanel.css";

const REDISTRIBUTION_POLICY_STORAGE_KEY =
  "greener:projections:redistribution-policy";

type ServiceRedistributionPanelProps = {
  period: AnalysisPeriodWindow;
};

type RegionDistribution = {
  regionCode: string;
  serviceCount: number;
  carbonIntensityGco2ePerKwh: number | null;
};

function getInitialOccupancyPolicy(): ServiceRedistributionPolicy {
  const savedPolicy = localStorage.getItem(REDISTRIBUTION_POLICY_STORAGE_KEY);

  if (
    savedPolicy === "preserve_current_counts" ||
    savedPolicy === "balanced" ||
    savedPolicy === "unconstrained"
  ) {
    return savedPolicy;
  }

  return "balanced";
}

function formatEnergy(energyKwh: number | null): string {
  if (energyKwh === null) {
    return "Não calculável";
  }

  return `${energyKwh.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} kWh`;
}

function formatEmissions(emissionsGco2e: number | null): string {
  if (emissionsGco2e === null) {
    return "Não calculável";
  }

  return `${emissionsGco2e.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} gCO₂e`;
}

function formatDifferencePercent(
  differencePercent: number | null,
  hasComparableCoverage = true,
): string {
  if (!hasComparableCoverage) {
    return "Não comparável";
  }

  if (differencePercent === null) {
    return "Não calculável";
  }

  const formattedPercent = differencePercent.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${differencePercent > 0 ? "+" : ""}${formattedPercent}%`;
}

function formatCoverageRatio(validCount: number, totalCount: number): string {
  return `${validCount}/${totalCount}`;
}

export function ServiceRedistributionPanel({
  period,
}: ServiceRedistributionPanelProps) {
  const [occupancyPolicy, setOccupancyPolicy] =
    useState<ServiceRedistributionPolicy>(getInitialOccupancyPolicy);
  const { result, loading, error, run } = useServiceRedistribution();
  const emissionSubtotal = calculateRedistributionEmissionSubtotal(
    result?.allocations ?? [],
  );

  const redistributionVisualData = useMemo(() => {
    if (result === null) {
      return null;
    }

    const intensityByRegion = new Map(
      result.regions.map((region) => [
        region.regionCode,
        region.carbonIntensityGco2ePerKwh,
      ]),
    );

    const currentRegionCounts = new Map<string, number>();

    for (const allocation of result.allocations) {
      currentRegionCounts.set(
        allocation.currentRegionCode,
        (currentRegionCounts.get(allocation.currentRegionCode) ?? 0) + 1,
      );
    }

    const buildDistribution = (
      counts: Map<string, number>,
    ): RegionDistribution[] => {
      return [...counts.entries()]
        .map(([regionCode, serviceCount]) => ({
          regionCode,
          serviceCount,
          carbonIntensityGco2ePerKwh: intensityByRegion.get(regionCode) ?? null,
        }))
        .sort((left, right) => left.regionCode.localeCompare(right.regionCode));
    };

    return {
      currentDistribution: buildDistribution(currentRegionCounts),

      suggestedDistribution: result.regions
        .map((region) => ({
          regionCode: region.regionCode,
          serviceCount: region.serviceCount,
          carbonIntensityGco2ePerKwh: region.carbonIntensityGco2ePerKwh,
        }))
        .sort((left, right) => left.regionCode.localeCompare(right.regionCode)),

      impact: {
        observedEmissionsGco2e: emissionSubtotal.observedEmissionsGco2e,

        projectedEmissionsGco2e: emissionSubtotal.projectedEmissionsGco2e,

        differencePercent: emissionSubtotal.differencePercent,

        comparableServiceCount: emissionSubtotal.comparableServiceCount,
      },
    };
  }, [result, emissionSubtotal]);

  useEffect(() => {
    localStorage.setItem(REDISTRIBUTION_POLICY_STORAGE_KEY, occupancyPolicy);
  }, [occupancyPolicy]);

  useEffect(() => {
    void run(period, occupancyPolicy);
  }, [period.start, period.end, occupancyPolicy, run]);

  return (
    <section
      className="service-redistribution-panel"
      aria-labelledby="service-redistribution-title"
    >
      <header className="service-redistribution-header">
        <div>
          <p className="analyses-section-label">CENÁRIO HIPOTÉTICO</p>
          <h2 id="service-redistribution-title">Redistribuição otimizada</h2>
          <p>
            A aplicação calcula automaticamente uma distribuição estimada dos
            serviços ativos entre as regiões disponíveis, conforme a política de
            ocupação selecionada e a mesma janela de análise.
          </p>
        </div>
      </header>

      <fieldset className="service-redistribution-constraints">
        <legend>Política de redistribuição</legend>

        <div className="service-redistribution-policy-grid">
          <label
            className={
              occupancyPolicy === "preserve_current_counts"
                ? "service-redistribution-policy is-selected"
                : "service-redistribution-policy"
            }
          >
            <input
              type="radio"
              name="occupancy-policy"
              checked={occupancyPolicy === "preserve_current_counts"}
              onChange={() => setOccupancyPolicy("preserve_current_counts")}
            />

            <span className="service-redistribution-policy-index">01</span>

            <span className="service-redistribution-policy-content">
              <strong>Preservar ocupação</strong>

              <small>
                Mantém exatamente a quantidade atual de serviços em cada região.
              </small>
            </span>

            <span
              className="service-redistribution-policy-state"
              aria-hidden="true"
            >
              =
            </span>
          </label>

          <label
            className={
              occupancyPolicy === "balanced"
                ? "service-redistribution-policy is-selected"
                : "service-redistribution-policy"
            }
          >
            <input
              type="radio"
              name="occupancy-policy"
              checked={occupancyPolicy === "balanced"}
              onChange={() => setOccupancyPolicy("balanced")}
            />

            <span className="service-redistribution-policy-index">02</span>

            <span className="service-redistribution-policy-content">
              <strong>Distribuir igualmente</strong>

              <small>
                Busca manter uma diferença máxima de um serviço entre regiões.
              </small>
            </span>

            <span
              className="service-redistribution-policy-state"
              aria-hidden="true"
            >
              ≋
            </span>
          </label>

          <label
            className={
              occupancyPolicy === "unconstrained"
                ? "service-redistribution-policy is-selected"
                : "service-redistribution-policy"
            }
          >
            <input
              type="radio"
              name="occupancy-policy"
              checked={occupancyPolicy === "unconstrained"}
              onChange={() => setOccupancyPolicy("unconstrained")}
            />

            <span className="service-redistribution-policy-index">03</span>

            <span className="service-redistribution-policy-content">
              <strong>Minimizar emissões</strong>

              <small>
                Permite concentrar serviços nas regiões com menor intensidade de
                carbono.
              </small>
            </span>

            <span
              className="service-redistribution-policy-state"
              aria-hidden="true"
            >
              ↓
            </span>
          </label>
        </div>
      </fieldset>

 

      {loading && (
        <p className="service-redistribution-state" role="status">
          Calculando uma distribuição para o período selecionado.
        </p>
      )}

      {error && (
        <p className="service-redistribution-state is-error" role="alert">
          {error}
        </p>
      )}

      {result && !loading && (
        <div className="service-redistribution-results">
          {redistributionVisualData && result.allocations.length > 0 && (
            <RedistributionScenarioOverview
              currentDistribution={redistributionVisualData.currentDistribution}
              suggestedDistribution={
                redistributionVisualData.suggestedDistribution
              }
            />
          )}

          {redistributionVisualData && result.allocations.length > 0 && (
            <RedistributionImpactSummary
              observedEmissionsGco2e={
                redistributionVisualData.impact.observedEmissionsGco2e
              }
              projectedEmissionsGco2e={
                redistributionVisualData.impact.projectedEmissionsGco2e
              }
              differencePercent={
                redistributionVisualData.impact.differencePercent
              }
              comparableServiceCount={
                redistributionVisualData.impact.comparableServiceCount
              }
              totalServiceCount={result.allocations.length}
            />
          )}

          {result.isPartial && (
            <p className="service-redistribution-state is-partial" role="note">
              Resultado parcial: algumas coletas não permitiram calcular energia
              ou emissão observada. Serviços sem energia válida permanecem na
              região atual e não são tratados como consumo zero. Percentuais não
              são calculados quando as coberturas divergem.
            </p>
          )}
          

          {result.allocations.length === 0 ? (
            <p className="service-redistribution-state" role="status">
              Nenhum serviço ativo foi encontrado no período.
            </p>
          ) : (
            <div className="service-redistribution-table-wrapper">
              <table className="service-redistribution-table">
                <caption>Alocação sugerida por serviço</caption>
                <thead>
                  <tr>
                    <th scope="col">Serviço</th>
                    <th scope="col">Região atual</th>
                    <th scope="col">Região sugerida</th>
                    <th scope="col">Energia observada</th>
                    <th scope="col">Emissões observadas</th>
                    <th scope="col">Emissões projetadas</th>
                    <th scope="col">Variação </th>
                  </tr>
                </thead>
                <tbody>
                  {result.allocations.map((allocation) => (
                    <tr key={allocation.serviceId}>
                      <th scope="row">{allocation.name}</th>
                      <td>{allocation.currentRegionCode}</td>
                      <td>{allocation.assignedRegionCode}</td>
                      <td>
                        <span>{formatEnergy(allocation.energyKwh)}</span>
                        <small
                          aria-label={`${allocation.validEnergySampleCount} de ${allocation.totalSampleCount} coletas com energia calculável`}
                        >
                          {formatCoverageRatio(
                            allocation.validEnergySampleCount,
                            allocation.totalSampleCount,
                          )}
                        </small>
                      </td>
                      <td>
                        <span>
                          {formatEmissions(allocation.observedEmissionsGco2e)}
                        </span>
                        <small
                          aria-label={`${allocation.validObservedEmissionSampleCount} de ${allocation.totalSampleCount} coletas com emissão observada calculável`}
                        >
                          {formatCoverageRatio(
                            allocation.validObservedEmissionSampleCount,
                            allocation.totalSampleCount,
                          )}
                        </small>
                      </td>
                      <td>
                        <span>
                          {formatEmissions(allocation.projectedEmissionsGco2e)}
                        </span>
                        {allocation.isPartial && (
                          <small className="service-redistribution-partial-label">
                            Parcial
                          </small>
                        )}
                      </td>
                      <td>
                        {formatDifferencePercent(
                          calculateEmissionDifferencePercent(allocation),
                          hasComparableEmissionCoverage(
                            allocation.validEnergySampleCount,
                            allocation.validObservedEmissionSampleCount,
                          ),
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="service-redistribution-subtotal">
                    <th scope="row" colSpan={4}>
                      Subtotal comparável (
                      {emissionSubtotal.comparableServiceCount} de{" "}
                      {result.allocations.length} serviços)
                    </th>
                    <td>
                      {formatEmissions(emissionSubtotal.observedEmissionsGco2e)}
                    </td>
                    <td>
                      {formatEmissions(
                        emissionSubtotal.projectedEmissionsGco2e,
                      )}
                    </td>
                    <td>
                      {formatDifferencePercent(
                        emissionSubtotal.differencePercent,
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="service-redistribution-comparison-note">
                Nas colunas de energia e emissão observada, a cobertura está em
                coletas válidas/total do período. A variação só é comparada
                quando as contagens válidas de energia e emissão observada
                coincidem; nesses casos, usa ((projetada − observada) /
                observada) × 100. Valores negativos indicam redução estimada. O
                subtotal considera apenas serviços com emissões calculáveis e
                coberturas coincidentes.
              </p>
            </div>
          )}

          <section
            className="service-redistribution-regions"
            aria-labelledby="service-redistribution-regions-title"
          >
            <h3 id="service-redistribution-regions-title">
              Ocupação e intensidade regional
            </h3>
            <ul>
              {result.regions.map((region) => (
                <li key={region.regionCode}>
                  <strong>{region.regionCode}</strong>
                  <span>{region.serviceCount} serviço(s)</span>
                  <span>
                    {region.carbonIntensityGco2ePerKwh.toLocaleString("pt-BR")}{" "}
                    gCO₂e/kWh
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {result.unavailableRegionCodes.length > 0 && (
            <p className="service-redistribution-state is-partial" role="note">
              Regiões sem snapshot atualizado e excluídas da otimização:{" "}
              {result.unavailableRegionCodes.join(", ")}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

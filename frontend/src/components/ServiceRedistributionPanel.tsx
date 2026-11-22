import { useEffect, useMemo, useState } from "react";

import { useServiceRedistribution } from "../hooks/useServiceRedistribution";

import {
  calculateEmissionDifferencePercent,
  calculateRedistributionEmissionSubtotal,
  hasComparableEmissionCoverage,
} from "../lib/redistributionEmissions";

import type { AnalysisPeriodWindow } from "../services/analysisPeriod";

import type { ServiceRedistributionPolicy } from "../types/projection";

import { RedistributionScenarioOverview } from "./RedistributionScenarioOverview";
import { RedistributionImpactSummary } from "./RedistributionImpactSummary";

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

/* =========================================================
   POLÍTICA INICIAL
   ========================================================= */

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

/* =========================================================
   FORMATAÇÃO
   ========================================================= */

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

/* =========================================================
   COMPONENTE
   ========================================================= */

export function ServiceRedistributionPanel({
  period,
}: ServiceRedistributionPanelProps) {
  /* -------------------------------------------------------
     POLÍTICA SELECIONADA
     ------------------------------------------------------- */

  const [occupancyPolicy, setOccupancyPolicy] =
    useState<ServiceRedistributionPolicy>(getInitialOccupancyPolicy);

  /* -------------------------------------------------------
     DADOS DA API
     ------------------------------------------------------- */

  const { result, loading, error, run } = useServiceRedistribution();

  /* -------------------------------------------------------
     SUBTOTAL COMPARÁVEL

     A função utiliza agora a projeção calculada sobre a
     mesma cobertura de amostras da emissão observada.
     ------------------------------------------------------- */

  const emissionSubtotal = calculateRedistributionEmissionSubtotal(
    result?.allocations ?? [],
  );

  /* -------------------------------------------------------
     REFRESH

     loading + resultado existente significa que estamos
     atualizando uma simulação já exibida.

     Isso permite manter a interface montada durante uma
     nova requisição e evita o "piscar".
     ------------------------------------------------------- */

  const isRefreshing = loading && result !== null;

  /* -------------------------------------------------------
     DADOS DERIVADOS PARA A VISUALIZAÇÃO

     Não criamos novos estados porque essas informações
     podem ser obtidas diretamente do resultado da API.
     ------------------------------------------------------- */

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

    /*
     * O cenário atual é derivado das allocations.
     *
     * O cenário sugerido utiliza result.regions porque
     * o backend já retorna a distribuição final,
     * inclusive regiões com zero serviços.
     */

    return {
      currentDistribution: buildDistribution(currentRegionCounts),

      suggestedDistribution: result.regions
        .map((region) => ({
          regionCode: region.regionCode,

          serviceCount: region.serviceCount,

          carbonIntensityGco2ePerKwh: region.carbonIntensityGco2ePerKwh,
        }))
        .sort((left, right) => left.regionCode.localeCompare(right.regionCode)),
    };
  }, [result]);

  /* -------------------------------------------------------
     PERSISTE POLÍTICA NO NAVEGADOR
     ------------------------------------------------------- */

  useEffect(() => {
    localStorage.setItem(REDISTRIBUTION_POLICY_STORAGE_KEY, occupancyPolicy);
  }, [occupancyPolicy]);

  /* -------------------------------------------------------
     EXECUÇÃO AUTOMÁTICA

     O cálculo acontece automaticamente:

     - ao abrir o componente;
     - ao alterar o período;
     - ao alterar a política.

     Por isso não precisamos do botão "Recalcular".
     ------------------------------------------------------- */

  useEffect(() => {
    void run(period, occupancyPolicy);
  }, [period.start, period.end, occupancyPolicy, run]);

  return (
    <section
      className="service-redistribution-panel"
      aria-labelledby="service-redistribution-title"
    >
      {/* ===================================================
          CABEÇALHO
          =================================================== */}

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

      {/* ===================================================
          POLÍTICAS
          =================================================== */}

      <fieldset className="service-redistribution-constraints">
        <legend>Política de redistribuição</legend>

        <div className="service-redistribution-policy-grid">
          {/* -----------------------------------------------
              01 - PRESERVAR
              ----------------------------------------------- */}

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

          {/* -----------------------------------------------
              02 - EQUILIBRAR
              ----------------------------------------------- */}

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
                Busca manter uma diferença máxima de um serviço entre as
                regiões.
              </small>
            </span>

            <span
              className="service-redistribution-policy-state"
              aria-hidden="true"
            >
              ≋
            </span>
          </label>

          {/* -----------------------------------------------
              03 - MINIMIZAR EMISSÕES
              ----------------------------------------------- */}

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

      {/* ===================================================
          PRIMEIRO CARREGAMENTO

          Só aparece quando ainda não temos resultado.
          =================================================== */}

      {loading && !result && (
        <p className="service-redistribution-state" role="status">
          Calculando uma distribuição para o período selecionado.
        </p>
      )}

      {/* ===================================================
          ERRO
          =================================================== */}

      {error && (
        <p className="service-redistribution-state is-error" role="alert">
          {error}
        </p>
      )}

      {/* ===================================================
          RESULTADOS

          Continuam montados enquanto uma nova requisição
          acontece. Isso evita o flash da interface.
          =================================================== */}

      {result && (
        <div
          className={
            isRefreshing
              ? "service-redistribution-results is-refreshing"
              : "service-redistribution-results"
          }
          aria-busy={isRefreshing}
        >
          {/* ------------------------------------------------
              INDICADOR DE ATUALIZAÇÃO
              ------------------------------------------------ */}

          {isRefreshing && (
            <div
              className="service-redistribution-refresh-indicator"
              role="status"
            >
              Atualizando cenário...
            </div>
          )}

          {/* ------------------------------------------------
              VISUALIZAÇÃO ANTES → DEPOIS
              ------------------------------------------------ */}

          {redistributionVisualData && result.allocations.length > 0 && (
            <RedistributionScenarioOverview
              currentDistribution={redistributionVisualData.currentDistribution}
              suggestedDistribution={
                redistributionVisualData.suggestedDistribution
              }
            />
          )}

          {/* ------------------------------------------------
              IMPACTO AMBIENTAL
              ------------------------------------------------ */}

          {result.allocations.length > 0 && (
            <RedistributionImpactSummary
              observedEmissionsGco2e={emissionSubtotal.observedEmissionsGco2e}
              projectedEmissionsGco2e={emissionSubtotal.projectedEmissionsGco2e}
              differencePercent={emissionSubtotal.differencePercent}
              comparableServiceCount={emissionSubtotal.comparableServiceCount}
              totalServiceCount={result.allocations.length}
            />
          )}

          {/* ------------------------------------------------
              RESULTADO PARCIAL
              ------------------------------------------------ */}

          {result.isPartial && (
            <p className="service-redistribution-state is-partial" role="note">
              Resultado parcial: algumas coletas não permitiram calcular energia
              ou emissão observada. Serviços sem energia válida permanecem na
              região atual e não são tratados como consumo zero. Quando a
              cobertura de carbono é parcial, a comparação considera apenas as
              amostras com energia e intensidade de carbono válidas.
            </p>
          )}

          {/* ------------------------------------------------
              SEM SERVIÇOS
              ------------------------------------------------ */}

          {result.allocations.length === 0 ? (
            <p className="service-redistribution-state" role="status">
              Nenhum serviço ativo foi encontrado no período.
            </p>
          ) : (
            /* ===============================================
               TABELA DETALHADA
               =============================================== */

            <div className="service-redistribution-table-wrapper">
               <div
    className="service-redistribution-table-scroll"
    tabIndex={0}
    role="region"
    aria-label="Tabela de alocação sugerida por serviço"
  >
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

                    <th scope="col">Variação vs. observado</th>
                  </tr>
                </thead>

                <tbody>
                  {result.allocations.map((allocation) => {
                    /*
                     * Como agora estamos dentro de um bloco
                     * de função, podemos calcular valores
                     * auxiliares uma única vez por linha.
                     */

                    const stayedInRegion =
                      allocation.currentRegionCode ===
                      allocation.assignedRegionCode;

                    const differencePercent =
                      calculateEmissionDifferencePercent(allocation);

                    const hasComparableCoverage = hasComparableEmissionCoverage(
                      allocation.validEnergySampleCount,
                      allocation.validObservedEmissionSampleCount,
                    );

                    return (
                      <tr key={allocation.serviceId}>
                        {/* SERVIÇO */}

                        <th scope="row">{allocation.name}</th>

                        {/* REGIÃO ATUAL */}

                        <td className="service-redistribution-current-region">
                          <span>{allocation.currentRegionCode}</span>
                        </td>

                        {/* REGIÃO SUGERIDA */}

                        <td className="service-redistribution-suggested-region">
                          <div className="service-redistribution-route-target">
                            <span
                              className={
                                stayedInRegion
                                  ? "service-redistribution-route-arrow is-static"
                                  : "service-redistribution-route-arrow"
                              }
                              aria-hidden="true"
                            >
                              {stayedInRegion ? "•" : "→"}
                            </span>

                            <strong>{allocation.assignedRegionCode}</strong>
                          </div>

                          <small>
                            {stayedInRegion
                              ? "Permanece na região"
                              : "Realocação sugerida"}
                          </small>
                        </td>

                        {/* ENERGIA */}

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

                        {/* EMISSÕES OBSERVADAS */}

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

                        {/* EMISSÕES PROJETADAS */}

                        <td>
                          <span>
                            {formatEmissions(
                              allocation.projectedEmissionsGco2e,
                            )}
                          </span>

                          {allocation.isPartial && (
                            <small className="service-redistribution-partial-label">
                              Parcial
                            </small>
                          )}
                        </td>

                        {/* VARIAÇÃO */}

                        <td>
                          <strong
                            className={
                              differencePercent !== null &&
                              differencePercent < 0
                                ? "service-redistribution-variation is-reduction"
                                : "service-redistribution-variation"
                            }
                          >
                            {formatDifferencePercent(
                              differencePercent,
                              hasComparableCoverage,
                            )}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}

                  {/* -----------------------------------------
                      SUBTOTAL COMPARÁVEL
                      ----------------------------------------- */}

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
              </div>

              {/* --------------------------------------------
                  NOTA METODOLÓGICA
                  -------------------------------------------- */}

              <p className="service-redistribution-comparison-note">
                A cobertura indica quantas coletas válidas participaram de cada
                cálculo. Quando nem todas possuem intensidade de carbono
                disponível, a comparação utiliza somente a energia das amostras
                com emissão observada calculável, mantendo a mesma base entre o
                cenário observado e o projetado.
              </p>
            </div>
          )}

          {/* =================================================
              OCUPAÇÃO REGIONAL
              ================================================= */}

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

          {/* =================================================
              REGIÕES INDISPONÍVEIS
              ================================================= */}

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

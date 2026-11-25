//react /router
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilePdf } from "@phosphor-icons/react";

//Componentes
import { HistoryChart } from "../components/HistoryChart";
import { ServiceHistoryPreview } from "../components/ServiceHistoryPreview";
import { ImpactRanking, type RankingMetric } from "../components/ImpactRanking";
import { ComparisonMetricSelector } from "../components/ComparisonMetricSelector";
import { ComparisonChart } from "../components/ComparisonChart";
import { ComparisonSummary } from "../components/ComparisonSummary";
import { ComparisonServiceSelector } from "../components/ComparisonServiceSelector";
import { ComparisonPeriodChart } from "../components/ComparisonPeriodChart";
import { LocationProjectionSummary } from "../components/LocationProjectionSummary";
import { LocationProjectionChart } from "../components/LocationProjectionChart";
import { LocationProjectionMap } from "../components/LocationProjectionMap";
import { ProjectionServiceCard } from "../components/ProjectionServiceCard";
import { ServiceRedistributionPanel } from "../components/ServiceRedistributionPanel";

//Hooks
import { useMonitoring } from "../hooks/useMonitoring";
import { useServiceIndicatorHistory } from "../hooks/useServiceIndicatorHistory";
import { useAnalysisPeriod } from "../hooks/useAnalysisPeriod";
import { useServiceIndicators } from "../hooks/useServiceIndicators";
import { useComparisonHistories } from "../hooks/useComparisonHistories";
import { useProjectionRegions } from "../hooks/useProjectionRegions";
import { useLocationProjection } from "../hooks/useLocationProjection";
import { useAnalysisReport } from "../hooks/useAnalysisReport";

//types
import type {
  ComparisonMetric,
  ComparisonVisualization,
} from "../types/comparison";

//helpers / libs
import { buildComparisonSeries } from "../lib/comparisonSeries";
import { formatServicePlace } from "../lib/serviceLocation";
import {
  MAX_COMPARISON_SERVICES,
  MIN_COMPARISON_SERVICES,
} from "../lib/comparisonLimits";

//Estilos / assets
import "./ui.css";
import "./Analyses.css";
import iconeBusca from "../assets/icones/icone-busca.png";
import iconeCompara from "../assets/icones/icone-compara.png";
import iconeRedistribui from "../assets/icones/icone-redistribui.png";

//Tipos e constantes
//Modos válidos da interface, restritos por union types.
type AnalysisLayout = "focus" | "overview" | "side";
type OverviewView = "charts" | "ranking";
type AnalysisMode = "explore" | "compare" | "project";
type ProjectionView = "location" | "redistribution";

// Chaves do localStorage - objetivo de persistência da interface
// as keys são utilizadas para preservar as preferências do usuário entre o carregamento da página
const ANALYSES_LAYOUT_STORAGE_KEY = "greener:analyses:layout";
const ANALYSES_OVERVIEW_STORAGE_KEY = "greener:analyses:overview-collapsed";
const ANALYSES_MODE_STORAGE_KEY = "greener:analyses:mode";
const ANALYSES_PROJECTION_VIEW_STORAGE_KEY = "greener:analyses:projection-view";

//Funções auxiliares
//verifica se há alguma preferência salva, ele checa qual modo de  analise a pagina se encontra
function getInitialAnalysisMode(): AnalysisMode {
  const savedMode = localStorage.getItem(ANALYSES_MODE_STORAGE_KEY);

  if (
    savedMode === "explore" ||
    savedMode === "compare" ||
    savedMode === "project"
  ) {
    return savedMode;
  }

  return "explore";
}
// Recupera a última visualização usada nas projeções.
function getInitialProjectionView(): ProjectionView {
  const savedView = localStorage.getItem(ANALYSES_PROJECTION_VIEW_STORAGE_KEY);

  if (savedView === "location" || savedView === "redistribution") {
    return savedView;
  }

  return "location";
}

// Função que define as iniciais dos serviços nos hexagonos, quando eles mudam os botões atualizam automaticamente.
function getServiceInitials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

//Componente Analyses
export function Analyses() {
  // 1- URL e serviços monitorados
  const [searchParams] = useSearchParams();
  const requestedServiceIdParam = searchParams.get("serviceId");
  //validação de entrada do frontend
  const requestedServiceId =
    requestedServiceIdParam !== null &&
    Number.isInteger(Number(requestedServiceIdParam))
      ? Number(requestedServiceIdParam)
      : null;

  // useRef guarda um valor sem provocar renderização , aqui utilizamos para verificar se  ja foi aplicado  o serviceId vindo da URL
  const appliedQueryServiceRef = useRef<number | null>(null);

  //O nosso Hook useMonitoring retorna os seguinte valores e alteramos o nome de loading, pois temos outros loadings no componente
  const {
    snapshot,
    loading: servicesLoading,
    error: servicesError,
  } = useMonitoring();

  const { services } = snapshot;

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null,
  );

  //2- Periodo de Análise e indicadores
  //O hook centraliza a janela temporal
  const {
    periods: analysisPeriods,
    durationMs: historyPeriodMs,
    period: analysisPeriod,
    selectPeriod,
  } = useAnalysisPeriod();

  const {
    indicators: serviceIndicators,
    loading: indicatorsLoading,
    error: indicatorsError,
  } = useServiceIndicators(analysisPeriod);

  const analysisPeriodLabel =
    analysisPeriods.find((period) => period.value === historyPeriodMs)?.label ??
    "Período atual";

  // Evita exibir indicadores de uma janela anterior enquanto os dados do novo período ainda estão carregando.
  const indicatorsPeriodDurationMs = serviceIndicators
    ? new Date(serviceIndicators.period.end).getTime() -
      new Date(serviceIndicators.period.start).getTime()
    : null;

  const visibleServiceIndicators =
    indicatorsPeriodDurationMs !== null &&
    Math.abs(indicatorsPeriodDurationMs - historyPeriodMs) < 1000
      ? serviceIndicators
      : null;

  // 3 - Estado da Interface

  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(
    getInitialAnalysisMode,
  );

  const [analysisLayout, setAnalysisLayout] = useState<AnalysisLayout>(() => {
    const savedLayout = localStorage.getItem(ANALYSES_LAYOUT_STORAGE_KEY);

    if (
      savedLayout === "focus" ||
      savedLayout === "overview" ||
      savedLayout === "side"
    ) {
      return savedLayout;
    }

    return "focus";
  });

  const [overviewView, setOverviewView] = useState<OverviewView>("charts");

  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(() => {
    return localStorage.getItem(ANALYSES_OVERVIEW_STORAGE_KEY) === "true";
  });

  const overviewScrollRef = useRef<HTMLDivElement | null>(null);

  const [isChartTransitioning, setIsChartTransitioning] = useState(false);

  //  // 4. COMPARAÇÃO DE SERVIÇOS
  // Seleção, métrica, visualização e dados comparados.

  // trecho de Comparação de serviços : Seleção, métrica, visualização e históricos comparados.
  const [comparisonServiceIds, setComparisonServiceIds] = useState<number[]>(
    [],
  );

  const [comparisonMetric, setComparisonMetric] =
    useState<ComparisonMetric>("energy");

  const [comparisonVisualization, setComparisonVisualization] =
    useState<ComparisonVisualization>("timeline");

  const [comparisonFocusServiceId, setComparisonFocusServiceId] = useState<
    number | null
  >(null);

  function toggleComparisonService(serviceId: number) {
    setComparisonServiceIds((currentIds) => {
      const isSelected = currentIds.includes(serviceId);

      if (isSelected) {
        return currentIds.filter((currentId) => currentId !== serviceId);
      }
      if (currentIds.length >= MAX_COMPARISON_SERVICES) {
        return currentIds;
      }

      return [...currentIds, serviceId];
    });
  }

  //Esses dois não são estados comuns e sim ESTADOS DERIVADOS
  const canCompare = comparisonServiceIds.length >= MIN_COMPARISON_SERVICES;

  const comparisonLimitReached =
    comparisonServiceIds.length >= MAX_COMPARISON_SERVICES;

  function openSelectedServicesComparison() {
    if (!canCompare) {
      return;
    }

    setAnalysisMode("compare");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const {
    histories: comparisonHistories,
    loading: comparisonHistoriesLoading,
    error: comparisonHistoriesError,
    failedServiceIds: comparisonFailedServiceIds,
  } = useComparisonHistories(comparisonServiceIds, analysisPeriod, canCompare);

  const comparisonSeries = buildComparisonSeries(
    comparisonHistories,
    comparisonMetric,
  );

  const comparisonIndicators =
    serviceIndicators?.services.filter((service) =>
      comparisonServiceIds.includes(service.serviceId),
    ) ?? [];

  // ----------------------------------
  // ESTADOS DERIVADOS DE CARREGAMENTO
  // DA COMPARAÇÃO
  // ----------------------------------

  const isComparisonInitialLoading =
    canCompare && comparisonHistoriesLoading && comparisonSeries.length === 0;

  const isComparisonRefreshing =
    canCompare && comparisonHistoriesLoading && comparisonSeries.length > 0;

  const isPeriodInitialLoading =
    canCompare && indicatorsLoading && comparisonIndicators.length === 0;

  const isPeriodRefreshing =
    canCompare && indicatorsLoading && comparisonIndicators.length > 0;

  //5- PROJEÇÕES REGIONAIS

  const [projectionView, setProjectionView] = useState<ProjectionView>(
    getInitialProjectionView,
  );

  const [projectionServiceId, setProjectionServiceId] = useState<number | null>(
    null,
  );

  const [projectionRegionCodes, setProjectionRegionCodes] = useState<string[]>(
    [],
  );

  const {
    regions: projectionRegions,
    loading: projectionRegionsLoading,
    error: projectionRegionsError,
  } = useProjectionRegions(
    analysisMode === "project" && projectionView === "location",
  );

  const projectionService =
    services.find((service) => service.serviceId === projectionServiceId) ??
    null;

  const currentProjectionRegionCode =
    projectionService?.location.region_code ?? null;

  function toggleProjectionRegion(regionCode: string) {
    setProjectionRegionCodes((currentCodes) => {
      const isSelected = currentCodes.includes(regionCode);

      if (isSelected) {
        return currentCodes.filter((currentCode) => currentCode !== regionCode);
      }

      return [...currentCodes, regionCode];
    });
  }

  function changeProjectionService(serviceId: number) {
    setProjectionServiceId(serviceId);
    setProjectionRegionCodes([]);
  }

  const {
    projection,
    loading: projectionLoading,
    error: projectionError,
  } = useLocationProjection(
    projectionServiceId,
    analysisPeriod,
    projectionRegionCodes,
    analysisMode === "project" && projectionView === "location",
  );

  // 6 - HISTÓRICO DO SERVIÇO EM DESTAQUE

  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ?? null;

  const {
    downloadIndividualReport,
    downloadComparisonReport,
    isGeneratingReport,
    reportError,
  } = useAnalysisReport();

  function handleDownloadReport() {
    if (analysisMode === "explore") {
      if (!selectedService) {
        return;
      }

      void downloadIndividualReport(
        selectedService.serviceId,
        selectedService.name,
        analysisPeriod,
      );

      return;
    }

    if (analysisMode === "compare" && canCompare) {
      void downloadComparisonReport(
        comparisonServiceIds,
        comparisonMetric,
        analysisPeriod,
      );
    }
  }

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
  } = useServiceIndicatorHistory(selectedServiceId, analysisPeriod);

  const [previousHistory, setPreviousHistory] = useState<typeof history>(null);

  const visibleHistory = history ?? (historyLoading ? previousHistory : null);

  // 7 - SINCRONIZAÇÕES E EFEITOS

  //mantém o foco da comparação válido

  useEffect(() => {
    if (comparisonServiceIds.length === 0) {
      setComparisonFocusServiceId(null);
      return;
    }

    const focusedServiceStillSelected =
      comparisonFocusServiceId !== null &&
      comparisonServiceIds.includes(comparisonFocusServiceId);

    if (!focusedServiceStillSelected) {
      setComparisonFocusServiceId(comparisonServiceIds[0]);
    }
  }, [comparisonServiceIds, comparisonFocusServiceId]);

  // Sincroniza o serviço selecionado com a URL e com
  // a lista atual de serviços monitorados.

  useEffect(() => {
    if (services.length === 0) {
      setSelectedServiceId(null);
      return;
    }

    const requestedServiceExists =
      requestedServiceId !== null &&
      services.some((service) => service.serviceId === requestedServiceId);

    if (
      requestedServiceExists &&
      appliedQueryServiceRef.current !== requestedServiceId
    ) {
      appliedQueryServiceRef.current = requestedServiceId;

      setSelectedServiceId(requestedServiceId);

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
  }, [services, requestedServiceId]);

  // Ativa a transição visual quando o serviço ou
  // o período do histórico é alterado.

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

  // No layout lateral, mantém o card do serviço selecionado
  // centralizado dentro da área de rolagem.

  useEffect(() => {
    if (
      analysisLayout !== "side" ||
      isOverviewCollapsed ||
      selectedServiceId === null
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const container = overviewScrollRef.current;

      if (!container) {
        return;
      }

      const selectedCard = container.querySelector<HTMLElement>(
        `[data-service-id="${selectedServiceId}"]`,
      );

      if (!selectedCard) {
        return;
      }

      const containerRect = container.getBoundingClientRect();

      const cardRect = selectedCard.getBoundingClientRect();

      const cardTopInsideContainer =
        cardRect.top - containerRect.top + container.scrollTop;

      const targetTop =
        cardTopInsideContainer -
        container.clientHeight / 2 +
        cardRect.height / 2;

      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedServiceId, analysisLayout, isOverviewCollapsed]);

  // Mantém um serviço válido selecionado nas projeções.
  // Se o serviço atual não existir mais, reutiliza o serviço

  useEffect(() => {
    if (services.length === 0) {
      setProjectionServiceId(null);
      return;
    }

    setProjectionServiceId((currentServiceId) => {
      const currentServiceStillExists =
        currentServiceId !== null &&
        services.some((service) => service.serviceId === currentServiceId);

      if (currentServiceStillExists) {
        return currentServiceId;
      }

      return selectedServiceId ?? services[0].serviceId;
    });
  }, [services, selectedServiceId]);

  // Preserva o último histórico válido.
  // Isso evita que o gráfico desapareça durante uma atualização.

  useEffect(() => {
    if (history) {
      setPreviousHistory(history);
    }
  }, [history]);

  // Persistência das preferências da interface

  useEffect(() => {
    localStorage.setItem(ANALYSES_MODE_STORAGE_KEY, analysisMode);
  }, [analysisMode]);

  useEffect(() => {
    localStorage.setItem(ANALYSES_PROJECTION_VIEW_STORAGE_KEY, projectionView);
  }, [projectionView]);

  useEffect(() => {
    localStorage.setItem(ANALYSES_LAYOUT_STORAGE_KEY, analysisLayout);
  }, [analysisLayout]);

  useEffect(() => {
    localStorage.setItem(
      ANALYSES_OVERVIEW_STORAGE_KEY,
      String(isOverviewCollapsed),
    );
  }, [isOverviewCollapsed]);

  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("energy");

  // 8 - DADOS DERIVADOS PARA RENDERIZAÇÃO

  const validEnergySamples =
    visibleHistory?.samples.filter((sample) => sample.energyKwh !== null)
      .length ?? 0;

  const servicePlaces: Record<number, string> = {};

  for (const service of services) {
    servicePlaces[service.serviceId] = formatServicePlace(service.location);
  }

  //9 - JSX

  return (
    <div className="analyses-screen">
      <main
        className={
          analysisMode === "compare"
            ? "analyses-page analyses-page-compare"
            : "analyses-page"
        }
      >
        {/* =========== CABEÇALHO DA PÁGINA ========================= */}

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

        {/* =============== SELETOR DO MODO DE ANÁLISE ==================== */}
        <div
          className="analyses-mode-switch"
          role="group"
          aria-label="Modo de análise"
        >
          {/* =========== EXPLORAR ================= */}

          <button
            type="button"
            className={
              analysisMode === "explore"
                ? "analyses-mode-button is-active"
                : "analyses-mode-button"
            }
            aria-pressed={analysisMode === "explore"}
            onClick={() => setAnalysisMode("explore")}
          >
            <span className="analyses-mode-icon">
              <img src={iconeBusca} alt="" aria-hidden="true" />
            </span>

            <span className="analyses-mode-content">
              <strong>Explorar</strong>

              <small>
                Acompanhe o histórico, os indicadores e a visão geral dos
                serviços monitorados.
              </small>
            </span>

            <span className="analyses-mode-status" aria-hidden="true">
              {analysisMode === "explore" ? "ATIVO" : "→"}
            </span>
          </button>

          {/*============== COMPARAR ================*/}

          <button
            type="button"
            className={
              analysisMode === "compare"
                ? "analyses-mode-button is-active"
                : "analyses-mode-button"
            }
            aria-pressed={analysisMode === "compare"}
            onClick={() => setAnalysisMode("compare")}
          >
            <span className="analyses-mode-icon">
              <img src={iconeCompara} alt="" aria-hidden="true" />
            </span>

            <span className="analyses-mode-content">
              <strong>Comparar serviços</strong>

              <small>
                Compare consumo, emissões e comportamento ambiental entre
                diferentes serviços.
              </small>
            </span>

            <span className="analyses-mode-status" aria-hidden="true">
              {analysisMode === "compare" ? "ATIVO" : "→"}
            </span>
          </button>

          {/* ======= PROJEÇÕES REGIONAIS =========== */}

          <button
            type="button"
            className={
              analysisMode === "project"
                ? "analyses-mode-button is-active"
                : "analyses-mode-button"
            }
            aria-pressed={analysisMode === "project"}
            onClick={() => setAnalysisMode("project")}
          >
            <span className="analyses-mode-icon">
              <img src={iconeRedistribui} alt="" aria-hidden="true" />
            </span>

            <span className="analyses-mode-content">
              <strong>Projeções regionais</strong>

              <small>
                Simule cenários de localização e redistribuição para estimar
                diferentes impactos ambientais.
              </small>
            </span>

            <span className="analyses-mode-status" aria-hidden="true">
              {analysisMode === "project" ? "ATIVO" : "→"}
            </span>
          </button>
        </div>
        {/* ================= CONTROLES GLOBAIS
    Período analisado, layout e exportação
===================================================== */}
        <section
          className="analyses-controls analyses-global-controls"
          aria-labelledby="analysis-period-title"
        >
          <div>
            <p className="analyses-section-label">JANELA DE ANÁLISE</p>

            <h2 id="analysis-period-title">Período analisado</h2>

            <p className="analyses-control-description">
              {analysisMode === "explore"
                ? "O período selecionado é aplicado a todos os históricos exibidos na página."
                : analysisMode === "compare"
                  ? "O período selecionado é aplicado a todos os serviços da comparação."
                  : "O período selecionado define a janela de consumo utilizada na projeção ambiental."}
            </p>
          </div>

          <div className="analyses-global-actions">
            {/* ================= PERÍODO ================= */}
            <div className="analyses-control-group">
              <span>Período</span>

              <div
                className="analyses-period-options"
                aria-label="Período analisado"
              >
                {analysisPeriods.map((period) => {
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
                      onClick={() => selectPeriod(period.value)}
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ================= LAYOUT ================= */}
            {analysisMode === "explore" && (
              <div className="analyses-control-group">
                <span>Layout</span>

                <div
                  className="analyses-layout-options"
                  aria-label="Layout da análise"
                >
                  <button
                    type="button"
                    className={
                      analysisLayout === "focus"
                        ? "analyses-layout-button is-active"
                        : "analyses-layout-button"
                    }
                    onClick={() => setAnalysisLayout("focus")}
                  >
                    Foco
                  </button>

                  <button
                    type="button"
                    className={
                      analysisLayout === "overview"
                        ? "analyses-layout-button is-active"
                        : "analyses-layout-button"
                    }
                    onClick={() => setAnalysisLayout("overview")}
                  >
                    Geral
                  </button>

                  <button
                    type="button"
                    className={
                      analysisLayout === "side"
                        ? "analyses-layout-button is-active"
                        : "analyses-layout-button"
                    }
                    onClick={() => setAnalysisLayout("side")}
                  >
                    Lateral
                  </button>
                </div>
              </div>
            )}

            {/* ================= RELATÓRIO ================= */}
            {(analysisMode === "explore" || analysisMode === "compare") && (
              <div className="analyses-control-group analyses-report-control">
                <span>Relatório</span>

                <button
                  type="button"
                  className="analyses-report-button"
                  onClick={handleDownloadReport}
                  disabled={
                    isGeneratingReport ||
                    (analysisMode === "explore"
                      ? selectedService === null
                      : !canCompare)
                  }
                  aria-busy={isGeneratingReport}
                >
                  <FilePdf size={16} weight="bold" aria-hidden="true" />

                  <span>
                    {isGeneratingReport
                      ? "Gerando..."
                      : analysisMode === "compare"
                        ? "Exportar comparação"
                        : "Exportar relatório"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ================= ERRO DO RELATÓRIO ================= */}
        {(analysisMode === "explore" || analysisMode === "compare") &&
          reportError && (
            <div className="analyses-report-error" role="alert">
              {reportError}
            </div>
          )}

        {/* =====================================================
          ESTADOS GERAIS DOS SERVIÇOS
          Loading | erro | nenhum serviço disponível
      ===================================================== */}

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

        {/* =====================================================
          MODO: PROJEÇÕES REGIONAIS
         ===================================================== */}

        {analysisMode === "project" && services.length > 0 && (
          <section
            className="analyses-projection-workspace"
            aria-labelledby="projection-title"
          >
            {/* =====================================================
        SELETOR DO MODO DE PROJEÇÃO

        Primeiro o usuário escolhe qual experiência deseja:
        projetar um serviço ou redistribuir vários serviços.
        ===================================================== */}

            <div
              className="analyses-projection-view-switch"
              role="group"
              aria-label="Visualização da projeção regional"
            >
              <button
                type="button"
                className={
                  projectionView === "location"
                    ? "analyses-projection-view-button is-active"
                    : "analyses-projection-view-button"
                }
                aria-pressed={projectionView === "location"}
                onClick={() => setProjectionView("location")}
              >
                <span className="analyses-projection-view-index">01</span>

                <span className="analyses-projection-view-content">
                  <strong>Projetar localização</strong>

                  <small>
                    Compare o impacto de um serviço em diferentes matrizes
                    energéticas regionais.
                  </small>
                </span>

                <span
                  className="analyses-projection-view-status"
                  aria-hidden="true"
                >
                  {projectionView === "location" ? "ATIVO" : "→"}
                </span>
              </button>

              <button
                type="button"
                className={
                  projectionView === "redistribution"
                    ? "analyses-projection-view-button is-active"
                    : "analyses-projection-view-button"
                }
                aria-pressed={projectionView === "redistribution"}
                onClick={() => setProjectionView("redistribution")}
              >
                <span className="analyses-projection-view-index">02</span>

                <span className="analyses-projection-view-content">
                  <strong>Redistribuir serviços</strong>

                  <small>
                    Encontre uma distribuição regional otimizada para reduzir as
                    emissões estimadas.
                  </small>
                </span>

                <span
                  className="analyses-projection-view-status"
                  aria-hidden="true"
                >
                  {projectionView === "redistribution" ? "ATIVO" : "→"}
                </span>
              </button>
            </div>

            {/* =====================================================
        CONTEXTO DO MODO SELECIONADO

        Depois da escolha, explicamos o objetivo específico
        daquele modo.
        ===================================================== */}

            <div className="analyses-projection-intro">
              <div>
                <p className="analyses-section-label">PROJEÇÃO REGIONAL</p>

                <h2 id="projection-title">
                  {projectionView === "location"
                    ? "Projetar impacto por localização"
                    : "Redistribuir serviços entre regiões"}
                </h2>

                <p>
                  {projectionView === "location"
                    ? "Compare como o mesmo perfil de consumo energético poderia resultar em diferentes emissões de CO₂e quando associado a outras matrizes energéticas regionais."
                    : "Encontre uma distribuição estimada dos serviços ativos que minimize emissões, usando os dados observados na janela selecionada."}
                </p>
              </div>

              <div className="analyses-projection-notice">
                <strong>
                  {projectionView === "location"
                    ? "Simulação ambiental"
                    : "Cenário de redistribuição"}
                </strong>

                <span>
                  {projectionView === "location"
                    ? "A projeção mantém o consumo energético do serviço constante e altera apenas o fator ambiental da localização."
                    : "A sugestão não executa migrações. Dados parciais são sinalizados; serviços sem energia calculável permanecem na região atual."}
                </span>
              </div>
            </div>

            {projectionView === "location" ? (
              <>
                <div className="analyses-projection-primary">
                  <ProjectionServiceCard
                    service={projectionService}
                    services={services}
                    selectedServiceId={projectionServiceId}
                    energyKwh={projection?.energyKwh ?? null}
                    isPartial={projection?.isPartial ?? false}
                    regions={projectionRegions}
                    selectedRegionCodes={projectionRegionCodes}
                    currentRegionCode={currentProjectionRegionCode}
                    onChangeService={changeProjectionService}
                    onToggleRegion={toggleProjectionRegion}
                  />

                  <LocationProjectionMap
                    service={projectionService}
                    regions={projectionRegions}
                    selectedRegionCodes={projectionRegionCodes}
                    onToggleRegion={toggleProjectionRegion}
                  />
                </div>

                {/* =====================================================
    ESTADO INICIAL
    ===================================================== */}
                {projectionRegionCodes.length === 0 && (
                  <div
                    className="analyses-projection-placeholder"
                    role="status"
                  >
                    <span aria-hidden="true">◎</span>

                    <div>
                      <strong>Selecione uma ou mais localidades</strong>

                      <p>
                        Os cenários serão calculados mantendo o consumo
                        energético do serviço constante.
                      </p>
                    </div>
                  </div>
                )}

                {/* =====================================================
    PROJEÇÃO SENDO CALCULADA
    ===================================================== */}
                {projectionLoading && (
                  <div className="analyses-history-state" role="status">
                    <h3>Calculando projeção</h3>

                    <p>
                      Comparando o consumo observado com os fatores ambientais
                      das regiões selecionadas.
                    </p>
                  </div>
                )}

                {/* =====================================================
    ERRO NA PROJEÇÃO
    ===================================================== */}
                {projectionError && (
                  <div
                    className="analyses-history-state analyses-state-error"
                    role="alert"
                  >
                    <h3>Não foi possível calcular a projeção</h3>

                    <p>{projectionError}</p>
                  </div>
                )}

                {/* =====================================================
    RESULTADO TEMPORÁRIO
    ===================================================== */}
                {projection && !projectionLoading && !projectionError && (
                  <div className="analyses-projection-results">
                    <LocationProjectionChart scenarios={projection.scenarios} />

                    <LocationProjectionSummary projection={projection} />
                  </div>
                )}
              </>
            ) : (
              <ServiceRedistributionPanel period={analysisPeriod} />
            )}
          </section>
        )}

        {/* =====================================================
          MODO: COMPARAÇÃO DE SERVIÇOS
          ===================================================== */}

        {analysisMode === "compare" && services.length > 0 && (
          <div className="analyses-comparison-workspace">
            <div className="analyses-comparison-controls">
              <ComparisonServiceSelector
                services={services}
                selectedServiceIds={comparisonServiceIds}
                minServices={MIN_COMPARISON_SERVICES}
                maxServices={MAX_COMPARISON_SERVICES}
                canCompare={canCompare}
                limitReached={comparisonLimitReached}
                onToggleService={toggleComparisonService}
              />

              <ComparisonMetricSelector
                metric={comparisonMetric}
                onMetricChange={setComparisonMetric}
              />
            </div>

            {/* SELETOR DO TIPO DE VISUALIZAÇÃO */}
            {canCompare && (
              <div className="comparison-visualization-switch">
                <button
                  type="button"
                  className={
                    comparisonVisualization === "timeline"
                      ? "comparison-visualization-button is-active"
                      : "comparison-visualization-button"
                  }
                  aria-pressed={comparisonVisualization === "timeline"}
                  onClick={() => setComparisonVisualization("timeline")}
                >
                  Evolução temporal
                </button>

                <button
                  type="button"
                  className={
                    comparisonVisualization === "period"
                      ? "comparison-visualization-button is-active"
                      : "comparison-visualization-button"
                  }
                  aria-pressed={comparisonVisualization === "period"}
                  onClick={() => setComparisonVisualization("period")}
                >
                  Comparação do período
                </button>
              </div>
            )}

            {/* SEM SERVIÇOS SUFICIENTES */}
            {!canCompare && (
              <div className="analyses-history-state" role="status">
                <h3>Selecione pelo menos 2 serviços</h3>

                <p>
                  A comparação ficará disponível quando houver entre{" "}
                  {MIN_COMPARISON_SERVICES} e {MAX_COMPARISON_SERVICES} serviços
                  selecionados.
                </p>
              </div>
            )}

            {/* LOADING INICIAL DA EVOLUÇÃO TEMPORAL */}
            {comparisonVisualization === "timeline" &&
              isComparisonInitialLoading && (
                <div className="analyses-history-state" role="status">
                  <h3>Carregando comparação</h3>

                  <p>Consultando os históricos dos serviços selecionados.</p>
                </div>
              )}

            {/* A falha parcial avisa o usuário sem esconder os históricos recebidos. */}
            {canCompare &&
              comparisonVisualization === "timeline" &&
              comparisonHistoriesError && (
                <div
                  className={
                    comparisonHistories.length > 0
                      ? "analyses-warning"
                      : "analyses-history-state analyses-state-error"
                  }
                  role={comparisonHistories.length > 0 ? "status" : "alert"}
                >
                  <h3>
                    {comparisonHistories.length > 0
                      ? "Comparação parcial"
                      : "Não foi possível carregar a comparação"}
                  </h3>

                  <p>{comparisonHistoriesError}</p>
                  {comparisonFailedServiceIds.length > 0 && (
                    <p>
                      Históricos não carregados:{" "}
                      {comparisonFailedServiceIds
                        .map(
                          (id) =>
                            services.find((service) => service.serviceId === id)
                              ?.name ?? `Serviço ${id}`,
                        )
                        .join(", ")}
                      .
                    </p>
                  )}
                  {comparisonHistories.length === 1 && (
                    <p>Apenas um serviço está disponível nesta visualização.</p>
                  )}
                </div>
              )}

            {/* VISUALIZAÇÃO TEMPORAL */}
            {canCompare &&
              comparisonSeries.length > 0 &&
              comparisonVisualization === "timeline" && (
                <div
                  className={
                    isComparisonRefreshing
                      ? "comparison-visualization-frame is-refreshing"
                      : "comparison-visualization-frame"
                  }
                >
                  <ComparisonChart
                    series={comparisonSeries}
                    metric={comparisonMetric}
                    periodStart={analysisPeriod.start}
                    periodEnd={analysisPeriod.end}
                    focusServiceId={comparisonFocusServiceId}
                    onFocusServiceChange={setComparisonFocusServiceId}
                  />

                  {isComparisonRefreshing && (
                    <div
                      className="comparison-refresh-overlay"
                      aria-hidden="true"
                    >
                      Atualizando…
                    </div>
                  )}
                </div>
              )}
            {/* LOADING INICIAL DA COMPARAÇÃO DO PERÍODO */}
            {comparisonVisualization === "period" && isPeriodInitialLoading && (
              <div className="analyses-history-state" role="status">
                <h3>Carregando comparação consolidada</h3>

                <p>Preparando os indicadores consolidados do período.</p>
              </div>
            )}

            {/* COMPARAÇÃO CONSOLIDADA DO PERÍODO */}
            {canCompare &&
              comparisonIndicators.length > 0 &&
              comparisonVisualization === "period" && (
                <div
                  className={
                    isPeriodRefreshing
                      ? "comparison-visualization-frame is-refreshing"
                      : "comparison-visualization-frame"
                  }
                >
                  <ComparisonPeriodChart
                    services={comparisonIndicators}
                    selectedServiceIds={comparisonServiceIds}
                    metric={comparisonMetric}
                    focusServiceId={comparisonFocusServiceId}
                    onFocusServiceChange={setComparisonFocusServiceId}
                  />

                  {isPeriodRefreshing && (
                    <div
                      className="comparison-refresh-overlay"
                      aria-hidden="true"
                    >
                      Atualizando…
                    </div>
                  )}
                </div>
              )}

            {/* RESUMO CONSOLIDADO */}
            {canCompare && comparisonIndicators.length > 0 && (
              <ComparisonSummary
                services={comparisonIndicators}
                places={servicePlaces}
                selectedServiceIds={comparisonServiceIds}
                focusServiceId={comparisonFocusServiceId}
                onFocusServiceChange={setComparisonFocusServiceId}
              />
            )}
          </div>
        )}

        {/* =====================================================
          MODO: EXPLORAÇÃO
        ===================================================== */}

        {analysisMode === "explore" && (
          <div className={`analyses-layout analyses-layout-${analysisLayout}`}>
            {services.length > 0 && (
              <section
                className="analyses-overview"
                aria-labelledby="analyses-overview-title"
              >
                <div className="analyses-overview-header">
                  <div>
                    <p className="analyses-section-label">VISÃO GERAL</p>

                    <h2 id="analyses-overview-title">
                      Visão geral dos serviços
                    </h2>

                    {!isOverviewCollapsed && (
                      <p>
                        Explore a evolução e o impacto ambiental dos serviços no
                        período selecionado
                      </p>
                    )}
                  </div>

                  <div className="analyses-overview-actions">
                    {overviewView === "charts" && (
                      <span className="analyses-overview-unit">kWh</span>
                    )}

                    <button
                      type="button"
                      className="analyses-overview-toggle"
                      onClick={() =>
                        setIsOverviewCollapsed((current) => !current)
                      }
                      aria-expanded={!isOverviewCollapsed}
                      aria-controls="analyses-overview-content"
                      title={
                        isOverviewCollapsed
                          ? "Expandir visão geral"
                          : "Minimizar visão geral"
                      }
                    >
                      <span aria-hidden="true">
                        {isOverviewCollapsed ? "+" : "−"}
                      </span>
                    </button>
                  </div>
                </div>

                {!isOverviewCollapsed && (
                  <div className="analyses-overview-toolbar">
                    <div
                      className="analyses-overview-view-options"
                      aria-label="Visualização da visão geral"
                    >
                      <button
                        type="button"
                        className={
                          overviewView === "charts"
                            ? "analyses-overview-view-button is-active"
                            : "analyses-overview-view-button"
                        }
                        aria-pressed={overviewView === "charts"}
                        onClick={() => setOverviewView("charts")}
                      >
                        Gráficos
                      </button>

                      <button
                        type="button"
                        className={
                          overviewView === "ranking"
                            ? "analyses-overview-view-button is-active"
                            : "analyses-overview-view-button"
                        }
                        aria-pressed={overviewView === "ranking"}
                        onClick={() => setOverviewView("ranking")}
                      >
                        Ranking
                      </button>
                    </div>
                  </div>
                )}

                {!isOverviewCollapsed && overviewView === "charts" && (
                  <div
                    ref={overviewScrollRef}
                    id="analyses-overview-content"
                    className="analyses-overview-scroll"
                  >
                    <div className="analyses-overview-grid">
                      {services.map((service) => {
                        const isComparisonSelected =
                          comparisonServiceIds.includes(service.serviceId);

                        const comparisonDisabled =
                          comparisonLimitReached && !isComparisonSelected;

                        return (
                          <div
                            key={service.serviceId}
                            className={
                              isComparisonSelected
                                ? "analyses-preview-wrapper is-comparison-selected"
                                : "analyses-preview-wrapper"
                            }
                          >
                            <ServiceHistoryPreview
                              serviceId={service.serviceId}
                              name={service.name}
                              place={formatServicePlace(service.location)}
                              period={analysisPeriod}
                              isSelected={
                                selectedServiceId === service.serviceId
                              }
                              onSelect={() =>
                                setSelectedServiceId(service.serviceId)
                              }
                              isComparisonSelected={isComparisonSelected}
                              isComparisonDisabled={comparisonDisabled}
                              onToggleComparison={() =>
                                toggleComparisonService(service.serviceId)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {!isOverviewCollapsed && overviewView === "ranking" && (
                  <div
                    id="analyses-overview-content"
                    className="analyses-overview-ranking"
                  >
                    {indicatorsLoading && !visibleServiceIndicators && (
                      <div className="analyses-history-state" role="status">
                        <h3>Carregando ranking</h3>

                        <p>
                          Consultando os indicadores dos serviços para o período
                          de {analysisPeriodLabel}.
                        </p>
                      </div>
                    )}

                    {indicatorsError && !visibleServiceIndicators && (
                      <div
                        className="analyses-history-state analyses-state-error"
                        role="alert"
                      >
                        <h3>Não foi possível carregar o ranking</h3>

                        <p>{indicatorsError}</p>
                      </div>
                    )}

                    {indicatorsError && visibleServiceIndicators && (
                      <div className="analyses-warning" role="status">
                        Não foi possível atualizar o ranking. Os últimos dados
                        válidos permanecem visíveis.
                      </div>
                    )}

                    {visibleServiceIndicators &&
                      visibleServiceIndicators.services.length === 0 && (
                        <div className="analyses-history-state" role="status">
                          <h3>Nenhum serviço disponível para o ranking</h3>

                          <p>
                            Não existem indicadores de serviços no período
                            selecionado.
                          </p>
                        </div>
                      )}

                    {visibleServiceIndicators &&
                      visibleServiceIndicators.services.length > 0 && (
                        <ImpactRanking
                          services={visibleServiceIndicators.services}
                          places={servicePlaces}
                          periodLabel={analysisPeriodLabel}
                          metric={rankingMetric}
                          onMetricChange={setRankingMetric}
                        />
                      )}
                  </div>
                )}
                {isOverviewCollapsed && (
                  <div className="analyses-overview-collapsed">
                    <span>{services.length} serviços</span>

                    <span aria-hidden="true">·</span>

                    <span>
                      {
                        analysisPeriods.find(
                          (period) => period.value === historyPeriodMs,
                        )?.label
                      }
                    </span>

                    <span aria-hidden="true">·</span>

                    <span>
                      {overviewView === "charts" ? "Gráficos" : "Ranking"}
                    </span>
                  </div>
                )}
              </section>
            )}

            {selectedService && (
              <section
                className="analyses-history"
                aria-labelledby="history-title"
              >
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
                      <p className="analyses-section-label">
                        HISTÓRICO AMBIENTAL
                      </p>

                      <h2 id="history-title">Energia estimada</h2>

                      <p className="analyses-history-service">
                        <strong>{selectedService.name}</strong>
                        <span aria-hidden="true">{" · "}</span>
                        {formatServicePlace(selectedService.location)}
                      </p>
                    </div>
                  </div>

                  <div className="analyses-history-actions">
                    <label className="analyses-history-service-select">
                      <span>Serviço em destaque</span>

                      <select
                        value={selectedServiceId ?? ""}
                        onChange={(event) =>
                          setSelectedServiceId(Number(event.target.value))
                        }
                      >
                        {services.map((service) => (
                          <option
                            key={service.serviceId}
                            value={service.serviceId}
                          >
                            {service.name} ·{" "}
                            {formatServicePlace(service.location)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="analyses-history-unit">
                      <span>Unidade</span>
                      <strong>kWh</strong>
                    </div>
                  </div>
                </div>

                {servicesError && (
                  <div className="analyses-warning" role="status">
                    A lista de serviços pode estar desatualizada. Estamos usando
                    a última consulta disponível.
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
                            {new Date(
                              visibleHistory.period.start,
                            ).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                            Ainda não existem coletas registradas para este
                            serviço no período selecionado.
                          </p>
                        </div>
                      )}

                      {visibleHistory.samples.length > 0 &&
                        validEnergySamples === 0 && (
                          <div className="analyses-history-state" role="status">
                            <h3>Energia ainda indisponível</h3>
                            <p>
                              Existem coletas no período, mas nenhuma possui
                              dados suficientes para calcular o consumo
                              energético.
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
          </div>
        )}
        {/* =====================================================
          BANDEJA DE SERVIÇOS SELECIONADOS
      ===================================================== */}

        {analysisMode === "explore" && comparisonServiceIds.length > 0 && (
          <aside
            className="analyses-comparison-tray"
            aria-label="Serviços selecionados para comparação"
          >
            <div className="analyses-comparison-tray-info">
              <span className="analyses-comparison-tray-count">
                {comparisonServiceIds.length}
              </span>

              <div>
                <strong>
                  {comparisonServiceIds.length === 1
                    ? "1 serviço selecionado"
                    : `${comparisonServiceIds.length} serviços selecionados`}
                </strong>

                <span>
                  {canCompare
                    ? "Pronto para comparar."
                    : "Selecione pelo menos mais um serviço."}
                </span>
              </div>
            </div>

            <div className="analyses-comparison-tray-actions">
              <button
                type="button"
                className="analyses-comparison-tray-clear"
                onClick={() => setComparisonServiceIds([])}
              >
                Limpar
              </button>

              <button
                type="button"
                className="analyses-comparison-tray-open"
                disabled={!canCompare}
                onClick={openSelectedServicesComparison}
              >
                Comparar selecionados
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </aside>
        )}
      </main>

      {/* =====================================================
        ELEMENTO VISUAL DE FUNDO
    ===================================================== */}

      <div className="analyses-waves" aria-hidden="true" />
    </div>
  );
}

import { AppError } from "../../shared/errors/AppError.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { IndicadoresService } from "../indicadores/indicadores.service.js";
import {
  parseChatPeriod,
  periodBounds,
  periodPhrase,
} from "./chat.period.js";
import {
  type ChatChart,
  type ChatChartPoint,
  type ChatClassification,
  type ChatIntent,
  type ChatLlm,
  type ChatPeriod,
  type ChatReply,
} from "./chat.types.js";
import { OllamaClient } from "./ollama.client.js";

const MAX_MESSAGE_LENGTH = 500;
const MAX_RANKING_ITEMS = 5;
const MAX_CHART_POINTS = 60;

const DISCLAIMER =
  "Valores estimados pelo modelo de potência v1 do GreenER; períodos com lacunas podem estar incompletos.";

type IndicatorsResult = Awaited<
  ReturnType<IndicadoresService["getIndicators"]>
>;

type ChatDraft = {
  intent: ChatIntent;
  answer: string;
  chart: ChatChart | null;
  partial: boolean;
  facts: unknown;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 4,
  });
}

function findServiceName(
  message: string,
  serviceNames: string[],
): string | null {
  const normalizedMessage = normalizeText(message);

  return (
    serviceNames.find((name) =>
      normalizedMessage.includes(normalizeText(name)),
    ) ?? null
  );
}

// Classificação usada quando o Ollama está desligado ou responde algo inválido.
function classifyByRules(
  message: string,
  serviceNames: string[],
): ChatClassification {
  const text = normalizeText(message);
  const mentionsRanking = /(mais|maior|menor|rank|ranking|top)/.test(text);
  const mentionsEnergy =
    /(energia|kwh|consum|gasta|gasto|potencia)/.test(text);
  const mentionsEmissions = /(emiss|co2|carbono|pegada)/.test(text);
  const mentionsEnvironment =
    /(ambiente|ambiental|panorama|visao geral|resumo geral|disponibilidade)/.test(
      text,
    );
  const mentionsService =
    /(servico|historico|evolucao|detalhe|desempenho)/.test(text);

  const serviceName = findServiceName(message, serviceNames);

  if (mentionsRanking && mentionsEmissions) {
    return { intent: "RANKING_EMISSIONS", serviceName: null };
  }

  if (mentionsRanking && mentionsEnergy) {
    return { intent: "RANKING_ENERGY", serviceName: null };
  }

  if (serviceName !== null) {
    return { intent: "SERVICE_SUMMARY", serviceName };
  }

  if (mentionsEnvironment) {
    return { intent: "ENVIRONMENT_SUMMARY", serviceName: null };
  }

  if (mentionsService) {
    return { intent: "SERVICE_SUMMARY", serviceName: null };
  }

  return { intent: "OUT_OF_SCOPE", serviceName: null };
}

function formatSampleLabel(value: Date, period: ChatPeriod): string {
  const date = new Date(value);

  return period === "7d"
    ? date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
    : date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
}

function buildOutOfScope(indicators: IndicatorsResult): ChatDraft {
  return {
    intent: "OUT_OF_SCOPE",
    answer:
      'Consigo responder apenas perguntas sobre os dados monitorados pelo GreenER, como consumo de energia, emissões, ranking entre serviços e disponibilidade. Por exemplo: "Qual serviço gasta mais energia?" ou "Resumo ambiental das últimas 24 horas".',
    chart: null,
    partial: false,
    facts: {
      availableServices: indicators.services
        .filter((service) => service.status === "active")
        .map((service) => service.name),
    },
  };
}

export class ChatService {
  constructor(
    private readonly indicators: Pick<
      IndicadoresService,
      "getIndicators" | "getServiceHistory"
    > = new IndicadoresService(),
    private readonly dashboard: Pick<
      DashboardService,
      "getSummary"
    > = new DashboardService(),
    private readonly llm: ChatLlm = new OllamaClient(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async chat(
    messageValue: string,
    periodValue: unknown = "24h",
  ): Promise<ChatReply> {
    const message = this.validateMessage(messageValue);
    const period = parseChatPeriod(periodValue);
    const { start, end } = periodBounds(period, this.now());
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // O modelo não consulta o banco: os dados chegam prontos das ferramentas do backend.
    const indicators = await this.indicators.getIndicators(startISO, endISO);
    const serviceNames = indicators.services
      .filter((service) => service.status === "active")
      .map((service) => service.name);

    let degraded = false;

    let classification = await this.llm.classify(message, serviceNames);
    if (classification === null) {
      classification = classifyByRules(message, serviceNames);
      degraded = true;
    }

    const draft = await this.buildDraft(
      classification,
      period,
      indicators,
      startISO,
      endISO,
    );

    let answer = draft.answer;
    let usedLlmAnswer = false;

    if (draft.intent === "OUT_OF_SCOPE") {
      // A recusa é sempre determinística para não abrir espaço a respostas fora do escopo.
      degraded = true;
    } else if (this.llm.enabled) {
      const llmAnswer = await this.llm.answer(message, {
        intent: draft.intent,
        period: {
          label: period,
          phrase: periodPhrase(period),
          start: startISO,
          end: endISO,
        },
        partial: draft.partial,
        facts: draft.facts,
        deterministicAnswer: draft.answer,
      });

      if (llmAnswer !== null && llmAnswer.trim() !== "") {
        answer = llmAnswer.trim();
        usedLlmAnswer = true;
      } else {
        degraded = true;
      }
    } else {
      degraded = true;
    }

    return {
      answer,
      intent: draft.intent,
      period: {
        start: startISO,
        end: endISO,
        label: period,
      },
      chart: draft.chart,
      partial: draft.partial,
      disclaimer: DISCLAIMER,
      model: usedLlmAnswer ? this.llm.model : "regras",
      degraded,
    };
  }

  private validateMessage(value: string): string {
    if (typeof value !== "string" || value.trim() === "") {
      throw new AppError(
        "Informe uma pergunta para o assistente",
        400,
        "INVALID_CHAT_MESSAGE",
      );
    }

    const message = value.trim();

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(
        `A pergunta deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres`,
        400,
        "INVALID_CHAT_MESSAGE",
      );
    }

    return message;
  }

  private async buildDraft(
    classification: ChatClassification,
    period: ChatPeriod,
    indicators: IndicatorsResult,
    startISO: string,
    endISO: string,
  ): Promise<ChatDraft> {
    switch (classification.intent) {
      case "RANKING_ENERGY":
      case "RANKING_EMISSIONS":
        return this.buildRanking(classification.intent, period, indicators);

      case "ENVIRONMENT_SUMMARY":
        return this.buildEnvironment(period, startISO, endISO);

      case "SERVICE_SUMMARY":
        return this.buildServiceSummary(
          classification.serviceName,
          period,
          indicators,
          startISO,
          endISO,
        );

      default:
        return buildOutOfScope(indicators);
    }
  }

  private buildRanking(
    intent: "RANKING_ENERGY" | "RANKING_EMISSIONS",
    period: ChatPeriod,
    indicators: IndicatorsResult,
  ): ChatDraft {
    const isEnergy = intent === "RANKING_ENERGY";
    const unit = isEnergy ? "kWh" : "gCO₂e";

    const ranking = indicators.services
      .filter((service) => service.status === "active")
      .map((service) => ({
        name: service.name,
        value: round(
          isEnergy
            ? service.periodTotals.energyKwh
            : service.periodTotals.emissionsGco2e,
        ),
      }))
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value)
      .slice(0, MAX_RANKING_ITEMS);

    if (ranking.length === 0) {
      return {
        intent,
        answer: `Não encontrei ${isEnergy ? "consumo de energia" : "emissões de CO₂ equivalente"} registrados ${periodPhrase(period)} para os serviços ativos. Isso pode acontecer quando não houve coletas no período.`,
        chart: null,
        partial: indicators.summary.isPartial,
        facts: {
          ranking: [],
          unit,
          activeServiceCount: indicators.summary.activeServiceCount,
          totals: {
            energyKwh: round(indicators.summary.energyKwh),
            emissionsGco2e: round(indicators.summary.emissionsGco2e),
          },
        },
      };
    }

    const [top, ...rest] = ranking;
    const action = isEnergy
      ? "consumiu mais energia"
      : "emitiu mais CO₂ equivalente";

    const restText =
      rest.length > 0
        ? ` Em seguida aparecem ${rest
            .map(
              (item) =>
                `${item.name} (${formatNumber(item.value)} ${unit})`,
            )
            .join(", ")}.`
        : "";

    const chart: ChatChart = {
      type: "bar",
      title: isEnergy
        ? "Consumo de energia por serviço"
        : "Emissões por serviço",
      unit,
      data: ranking.map((item) => ({
        label: item.name,
        value: item.value,
      })),
    };

    return {
      intent,
      answer: `${capitalize(periodPhrase(period))}, o serviço que ${action} foi ${top.name}, com ${formatNumber(top.value)} ${unit}.${restText}`,
      chart,
      partial: indicators.summary.isPartial,
      facts: {
        ranking: ranking.map((item) => ({
          service: item.name,
          value: item.value,
          unit,
        })),
        activeServiceCount: indicators.summary.activeServiceCount,
        totals: {
          energyKwh: round(indicators.summary.energyKwh),
          emissionsGco2e: round(indicators.summary.emissionsGco2e),
        },
      },
    };
  }

  private async buildEnvironment(
    period: ChatPeriod,
    startISO: string,
    endISO: string,
  ): Promise<ChatDraft> {
    const { summary } = await this.dashboard.getSummary(startISO, endISO);

    const chart: ChatChart = {
      type: "bar",
      title: "Disponibilidade dos serviços ativos",
      unit: "serviços",
      data: [
        { label: "Com métricas", value: summary.activeServiceCount },
        { label: "Sem métricas", value: summary.noMetricsServiceCount },
        { label: "Indisponíveis", value: summary.unavailableServiceCount },
      ],
    };

    const partialNote = summary.isPartial
      ? " O resultado é parcial porque há serviços sem coleta ou com lacunas no período."
      : "";

    return {
      intent: "ENVIRONMENT_SUMMARY",
      answer: `${capitalize(periodPhrase(period))}, os serviços ativos consumiram ${formatNumber(round(summary.energyKwh))} kWh e emitiram ${formatNumber(round(summary.emissionsGco2e))} gCO₂e. Dos ${summary.activeServiceCount} serviços ativos analisados, ${summary.noMetricsServiceCount} estão sem métricas e ${summary.unavailableServiceCount} estão indisponíveis.${partialNote}`,
      chart,
      partial: summary.isPartial,
      facts: {
        totals: {
          energyKwh: round(summary.energyKwh),
          emissionsGco2e: round(summary.emissionsGco2e),
        },
        availability: {
          activeServiceCount: summary.activeServiceCount,
          noMetricsServiceCount: summary.noMetricsServiceCount,
          unavailableServiceCount: summary.unavailableServiceCount,
        },
      },
    };
  }

  private async buildServiceSummary(
    serviceName: string | null,
    period: ChatPeriod,
    indicators: IndicatorsResult,
    startISO: string,
    endISO: string,
  ): Promise<ChatDraft> {
    const normalizedName =
      serviceName === null ? null : normalizeText(serviceName);

    const service =
      indicators.services.find(
        (candidate) =>
          normalizedName !== null &&
          normalizeText(candidate.name) === normalizedName,
      ) ?? null;

    if (service === null) {
      const availableServices = indicators.services
        .filter((candidate) => candidate.status === "active")
        .map((candidate) => candidate.name);

      const requested = serviceName === null ? "" : ` "${serviceName}"`;

      return {
        intent: "SERVICE_SUMMARY",
        answer:
          availableServices.length > 0
            ? `Não encontrei o serviço${requested} no catálogo. Os serviços ativos disponíveis são: ${availableServices.join(", ")}.`
            : "Não há serviços ativos cadastrados para consultar.",
        chart: null,
        partial: indicators.summary.isPartial,
        facts: {
          requestedService: serviceName,
          availableServices,
        },
      };
    }

    const totals = service.periodTotals;
    const history = await this.indicators.getServiceHistory(
      service.serviceId,
      startISO,
      endISO,
    );

    const stride = Math.max(
      1,
      Math.ceil(history.samples.length / MAX_CHART_POINTS),
    );

    const chartData: ChatChartPoint[] = [];

    for (let index = 0; index < history.samples.length; index += stride) {
      const bucket = history.samples.slice(index, index + stride);

      // Preserva uma amostra sem energia para que o gráfico mostre a interrupção.
      const sample =
        bucket.find((candidate) => candidate.energyKwh === null) ??
        bucket[bucket.length - 1];

      chartData.push({
        label: formatSampleLabel(sample.attemptedAt, period),
        value:
          sample.energyKwh === null ? null : round(sample.energyKwh),
      });
    }

    const partialNote = totals.isPartial
      ? " Os dados são parciais porque há lacunas de coleta ou de intensidade de carbono no período."
      : "";

    const chart: ChatChart | null =
      chartData.length > 0
        ? {
            type: "line",
            title: `Consumo de energia — ${service.name}`,
            unit: "kWh",
            data: chartData,
          }
        : null;

    return {
      intent: "SERVICE_SUMMARY",
      answer: `${capitalize(periodPhrase(period))}, o serviço ${service.name} consumiu ${formatNumber(round(totals.energyKwh))} kWh e emitiu ${formatNumber(round(totals.emissionsGco2e))} gCO₂e, com ${totals.validMetricCount} de ${totals.collectionCount} coletas com métricas válidas.${partialNote}`,
      chart,
      partial: totals.isPartial,
      facts: {
        service: {
          name: service.name,
          status: service.status,
          regionCode: service.regionCode,
        },
        totals: {
          energyKwh: round(totals.energyKwh),
          emissionsGco2e: round(totals.emissionsGco2e),
          collectionCount: totals.collectionCount,
          validMetricCount: totals.validMetricCount,
        },
        chartPoints: chartData.length,
      },
    };
  }
}

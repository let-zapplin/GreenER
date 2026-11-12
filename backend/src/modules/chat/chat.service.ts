import { randomUUID } from "node:crypto";
import { AppError } from "../../shared/errors/AppError.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { IndicadoresService } from "../indicadores/indicadores.service.js";
import {
  parseChatPeriod,
  periodBounds,
  periodPhrase,
} from "./chat.period.js";
import {
  InMemoryChatStateStore,
  type ChatConversationState,
  type ChatServiceReference,
  type ChatStateStore,
} from "./chat.state.js";
import {
  classifyKnowledgeByRules,
  fallbackKnowledgeSection,
  hasStrongKnowledgeCue,
  renderKnowledgeSection,
  retrieveKnowledge,
  type ChatKnowledgeIntent,
} from "./chat.knowledge.js";
import {
  type ChatChart,
  type ChatChartPoint,
  type ChatClassification,
  type ChatClarification,
  type ChatContext,
  type ChatHistoryMessage,
  type ChatIntent,
  type ChatLlm,
  type ChatPeriod,
  type ChatReply,
  type ChatRequestOptions,
  type ChatSuggestion,
} from "./chat.types.js";
import { OllamaClient } from "./ollama.client.js";

const MAX_MESSAGE_LENGTH = 500;
const MAX_RANKING_ITEMS = 5;
const MAX_CHART_POINTS = 60;
const MAX_CLARIFICATION_OPTIONS = 5;
const MAX_HISTORY_MESSAGES = 12;
const MAX_CONVERSATION_ID_LENGTH = 64;
const MAX_CONTEXT_PAGE_LENGTH = 200;
const MAX_CONTEXT_SERVICE_NAME_LENGTH = 120;

const DISCLAIMER =
  "Valores estimados pelo modelo de potência v1 do GreenER; períodos com lacunas podem estar incompletos.";

// Palavras que não ajudam a identificar um serviço. Servem apenas para
// comparar nomes e mensagens, nunca para alterar o texto exibido.
const SERVICE_STOPWORDS = new Set([
  "servico",
  "servicos",
  "service",
  "services",
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "uns",
  "umas",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "e",
  "ou",
  "para",
  "por",
  "com",
  "sobre",
  "ao",
  "qual",
  "quais",
  "quanto",
  "quanta",
  "como",
  "esta",
  "estao",
  "status",
  "detalhe",
  "detalhes",
  "historico",
  "evolucao",
  "desempenho",
  "resumo",
  "mostra",
  "mostre",
  "ver",
  "quero",
  "saber",
  "me",
  "diga",
  "informacao",
  "informacoes",
  "ultima",
  "ultimas",
  "ultimo",
  "ultimos",
  "hora",
  "horas",
  "dia",
  "dias",
  "semana",
  "semanas",
  "periodo",
  "agora",
  "hoje",
  "consumo",
  "consumiu",
  "consome",
  "energia",
  "emissao",
  "emissoes",
  "emitiu",
  "emite",
  "gasta",
  "gastou",
  "gasto",
  "pegada",
  "carbono",
  "co2",
  "kwh",
  "mais",
  "maior",
  "menor",
  "ranking",
  "top",
  "panorama",
  "ambiental",
  "ambiente",
  "disponibilidade",
]);

type IndicatorsResult = Awaited<
  ReturnType<IndicadoresService["getIndicators"]>
>;

type IndicatorService = IndicatorsResult["services"][number];

type ServiceResolution =
  | { kind: "unique"; service: IndicatorService }
  | { kind: "ambiguous"; candidates: IndicatorService[] }
  | { kind: "none" };

type MergedClassification = {
  intent: ChatIntent;
  service: IndicatorService | null;
  resolution: ServiceResolution;
  unknownServiceName: string | null;
};

type ChatDraft = {
  intent: ChatIntent;
  answer: string;
  chart: ChatChart | null;
  partial: boolean;
  facts: unknown;
  activeService: { serviceId: number; name: string } | null;
  clarification: ChatClarification | null;
  clarificationCandidates: Array<{ serviceId: number; name: string }>;
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

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token !== "");
}

function serviceNameTokens(name: string): string[] {
  return tokenize(name).filter(
    (token) => token.length >= 2 && !SERVICE_STOPWORDS.has(token),
  );
}

function containsWholePhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

function mentionsEnergy(text: string): boolean {
  return /(energia|kwh|consum|gasta|gasto|gastou|potencia)/.test(text);
}

function mentionsEmissions(text: string): boolean {
  return /(emiss|emit|co2|carbono|pegada)/.test(text);
}

function mentionsEnvironment(text: string): boolean {
  return /(ambiente|ambiental|panorama|visao geral|resumo geral|disponibilidade)/.test(
    text,
  );
}

function mentionsService(text: string): boolean {
  return /(servico|historico|evolucao|detalhe|desempenho|status)/.test(text);
}

function mentionsRanking(text: string): boolean {
  return /(mais|maior|menor|rank|ranking|top)/.test(text);
}

function isFollowUp(message: string): boolean {
  const text = normalizeText(message).trim();

  if (
    /\b(dele|dela|deles|delas|desse|dessa|deste|desta|nele|nela|nisso|nesse|nessa)\b/.test(
      text,
    )
  ) {
    return true;
  }

  return /^(e|agora|entao|tambem)\b/.test(text);
}

function isContextDependent(message: string): boolean {
  const text = normalizeText(message);

  if (isFollowUp(text)) {
    return true;
  }

  const meaningfulTokens = tokenize(text).filter(
    (token) => !SERVICE_STOPWORDS.has(token),
  );

  return (
    meaningfulTokens.length <= 6 &&
    (mentionsEnergy(text) || mentionsEmissions(text))
  );
}

function isServiceOnlyMessage(
  message: string,
  serviceName: string,
): boolean {
  const tokens = tokenize(message).filter(
    (token) => !SERVICE_STOPWORDS.has(token) && !/^\d+$/.test(token),
  );

  if (tokens.length === 0) {
    return false;
  }

  const nameTokens = new Set(serviceNameTokens(serviceName));

  return tokens.every((token) => nameTokens.has(token));
}

function extractServiceId(message: string): number | null {
  const match = normalizeText(message).match(
    /(?:servico|service|#)\s*(\d{1,9})/,
  );

  if (match === null) {
    return null;
  }

  const serviceId = Number(match[1]);

  return Number.isInteger(serviceId) && serviceId > 0 ? serviceId : null;
}

function extractOrdinal(message: string): number | null {
  const text = normalizeText(message);
  const words = ["primeiro", "segundo", "terceiro", "quarto", "quinto"];

  for (let index = 0; index < words.length; index += 1) {
    if (new RegExp(`\\b${words[index]}\\b`).test(text)) {
      return index + 1;
    }
  }

  const match = text.match(/^\s*(\d{1,2})\s*$/);

  return match === null ? null : Number(match[1]);
}

function extractRequestedServiceName(message: string): string | null {
  const text = normalizeText(message);
  const match = text.match(/\bservico\s+(.+)$/);

  if (match === null) {
    return null;
  }

  const tokens = match[1]
    .replace(/[?.!,;:]+/g, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        token !== "" &&
        !SERVICE_STOPWORDS.has(token) &&
        !/^\d+$/.test(token),
    );

  if (tokens.length === 0) {
    return null;
  }

  return tokens.slice(0, 4).join(" ");
}

function detectPeriodInMessage(message: string): ChatPeriod | null {
  const text = normalizeText(message);

  if (/\b(7|sete)\s+dias?\b|\b(uma|1)\s+semana\b|\bsemana\b/.test(text)) {
    return "7d";
  }

  if (/\b(6|seis)\s+horas?\b/.test(text)) {
    return "6h";
  }

  if (
    /\b(24|vinte e quatro)\s+horas?\b|\b(1|um|uma)\s+dia\b|\bhoje\b/.test(
      text,
    )
  ) {
    return "24h";
  }

  if (/\b(1|uma)\s+hora\b|\bultima hora\b/.test(text)) {
    return "1h";
  }

  return null;
}

function matchFullNames(
  message: string,
  services: IndicatorService[],
): IndicatorService[] {
  const normalizedMessage = normalizeText(message);

  const matches = services.filter((service) => {
    const normalizedName = normalizeText(service.name);

    return (
      normalizedName.length >= 2 &&
      containsWholePhrase(normalizedMessage, normalizedName)
    );
  });

  if (matches.length <= 1) {
    return matches;
  }

  // "Alpha" e "Alpha Beta" podem casar juntos; o nome mais específico vence.
  const longest = Math.max(
    ...matches.map((service) => normalizeText(service.name).length),
  );

  return matches.filter(
    (service) => normalizeText(service.name).length === longest,
  );
}

function matchByTokens(
  message: string,
  services: IndicatorService[],
): IndicatorService[] {
  const messageTokens = new Set(tokenize(message));

  let bestScore = 0;
  let best: IndicatorService[] = [];

  for (const service of services) {
    const tokens = serviceNameTokens(service.name);

    if (tokens.length === 0) {
      continue;
    }

    const score = tokens.filter((token) => messageTokens.has(token)).length;

    if (score === 0) {
      continue;
    }

    if (score > bestScore) {
      bestScore = score;
      best = [service];
    } else if (score === bestScore) {
      best.push(service);
    }
  }

  return best;
}

function resolveServiceFromText(
  text: string,
  services: IndicatorService[],
): ServiceResolution {
  const serviceId = extractServiceId(text);

  if (serviceId !== null) {
    const service = services.find(
      (candidate) => candidate.serviceId === serviceId,
    );

    return service === undefined
      ? { kind: "none" }
      : { kind: "unique", service };
  }

  const fullNameMatches = matchFullNames(text, services);

  if (fullNameMatches.length === 1) {
    return { kind: "unique", service: fullNameMatches[0] };
  }

  if (fullNameMatches.length > 1) {
    return { kind: "ambiguous", candidates: fullNameMatches };
  }

  const tokenMatches = matchByTokens(text, services);

  if (tokenMatches.length === 1) {
    return { kind: "unique", service: tokenMatches[0] };
  }

  if (tokenMatches.length > 1) {
    return { kind: "ambiguous", candidates: tokenMatches };
  }

  return { kind: "none" };
}

function resolveFromPendingClarification(
  message: string,
  services: IndicatorService[],
  state: ChatConversationState | null,
): ServiceResolution {
  const pending = state?.pendingClarification;

  if (pending === null || pending === undefined) {
    return { kind: "none" };
  }

  const candidates = pending.candidates
    .map((candidate) =>
      services.find((service) => service.serviceId === candidate.serviceId),
    )
    .filter((service): service is IndicatorService => service !== undefined);

  if (candidates.length === 0) {
    return { kind: "none" };
  }

  const ordinal = extractOrdinal(message);

  if (ordinal !== null && ordinal >= 1 && ordinal <= candidates.length) {
    return { kind: "unique", service: candidates[ordinal - 1] };
  }

  const messageTokens = new Set(tokenize(message));
  const matches = candidates.filter((candidate) =>
    serviceNameTokens(candidate.name).some((token) =>
      messageTokens.has(token),
    ),
  );

  if (matches.length === 1) {
    return { kind: "unique", service: matches[0] };
  }

  if (matches.length > 1) {
    return { kind: "ambiguous", candidates: matches };
  }

  return { kind: "none" };
}

function resolveServiceReference(
  message: string,
  services: IndicatorService[],
  state: ChatConversationState | null,
  context: ChatContext,
): ServiceResolution {
  const pendingResolution = resolveFromPendingClarification(
    message,
    services,
    state,
  );

  if (pendingResolution.kind !== "none") {
    return pendingResolution;
  }

  const explicitResolution = resolveServiceFromText(message, services);

  if (explicitResolution.kind !== "none") {
    return explicitResolution;
  }

  if (context.serviceName !== null) {
    const contextResolution = resolveServiceFromText(
      context.serviceName,
      services,
    );

    if (contextResolution.kind !== "none") {
      return contextResolution;
    }
  }

  if (
    state?.activeService !== null &&
    state?.activeService !== undefined &&
    isFollowUp(message) &&
    !mentionsRanking(normalizeText(message))
  ) {
    const active = services.find(
      (service) => service.serviceId === state.activeService?.serviceId,
    );

    if (active !== undefined) {
      return { kind: "unique", service: active };
    }
  }

  return { kind: "none" };
}

// Classificação usada quando o Ollama está desligado ou responde algo inválido.
function classifyByRules(
  message: string,
  resolution: ServiceResolution,
): ChatClassification {
  const text = normalizeText(message);
  const ranking = mentionsRanking(text);
  const emissions = mentionsEmissions(text);
  const energy = mentionsEnergy(text);
  const dataReference =
    ranking ||
    resolution.kind !== "none" ||
    mentionsEnvironment(text) ||
    mentionsService(text);

  const knowledgeIntent = classifyKnowledgeByRules(message, dataReference);

  if (knowledgeIntent !== null) {
    return { intent: knowledgeIntent, serviceName: null };
  }

  if (ranking && emissions) {
    return { intent: "RANKING_EMISSIONS", serviceName: null };
  }

  if (ranking && energy) {
    return { intent: "RANKING_ENERGY", serviceName: null };
  }

  if (resolution.kind === "unique") {
    return { intent: "SERVICE_SUMMARY", serviceName: resolution.service.name };
  }

  if (resolution.kind === "ambiguous") {
    return { intent: "SERVICE_SUMMARY", serviceName: null };
  }

  if (mentionsEnvironment(text)) {
    return { intent: "ENVIRONMENT_SUMMARY", serviceName: null };
  }

  if (mentionsService(text)) {
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
    activeService: null,
    clarification: null,
    clarificationCandidates: [],
  };
}

function normalizeOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(
      `O campo ${field} do contexto deve ser texto`,
      400,
      "INVALID_CHAT_CONTEXT",
    );
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new AppError(
      `O campo ${field} do contexto deve ter no máximo ${maxLength} caracteres`,
      400,
      "INVALID_CHAT_CONTEXT",
    );
  }

  return trimmed;
}

function parseChatContext(value: unknown): ChatContext {
  if (value === undefined || value === null) {
    return { page: null, serviceName: null };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(
      "O contexto da conversa deve ser um objeto JSON",
      400,
      "INVALID_CHAT_CONTEXT",
    );
  }

  const record = value as Record<string, unknown>;

  return {
    page: normalizeOptionalString(
      record.page,
      "page",
      MAX_CONTEXT_PAGE_LENGTH,
    ),
    serviceName: normalizeOptionalString(
      record.serviceName,
      "serviceName",
      MAX_CONTEXT_SERVICE_NAME_LENGTH,
    ),
  };
}

function parseChatHistory(value: unknown): ChatHistoryMessage[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AppError(
      "O histórico da conversa deve ser uma lista",
      400,
      "INVALID_CHAT_HISTORY",
    );
  }

  if (value.length > MAX_HISTORY_MESSAGES) {
    throw new AppError(
      `O histórico deve ter no máximo ${MAX_HISTORY_MESSAGES} mensagens`,
      400,
      "INVALID_CHAT_HISTORY",
    );
  }

  return value.map((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new AppError(
        "Cada item do histórico deve ter role e content",
        400,
        "INVALID_CHAT_HISTORY",
      );
    }

    const record = entry as Record<string, unknown>;
    const role = record.role;
    const content = record.content;

    if (role !== "user" && role !== "assistant") {
      throw new AppError(
        "O role do histórico deve ser user ou assistant",
        400,
        "INVALID_CHAT_HISTORY",
      );
    }

    if (
      typeof content !== "string" ||
      content.trim() === "" ||
      content.length > MAX_MESSAGE_LENGTH
    ) {
      throw new AppError(
        `O content do histórico deve ser texto de até ${MAX_MESSAGE_LENGTH} caracteres`,
        400,
        "INVALID_CHAT_HISTORY",
      );
    }

    return { role, content: content.trim() };
  });
}

function parseConversationId(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return randomUUID();
  }

  if (
    typeof value !== "string" ||
    value.length > MAX_CONVERSATION_ID_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new AppError(
      `O identificador da conversa deve ter até ${MAX_CONVERSATION_ID_LENGTH} caracteres alfanuméricos`,
      400,
      "INVALID_CHAT_CONVERSATION",
    );
  }

  return value;
}

function dropRepeatedCurrentMessage(
  history: ChatHistoryMessage[],
  message: string,
): ChatHistoryMessage[] {
  const last = history.at(-1);

  if (
    last !== undefined &&
    last.role === "user" &&
    normalizeText(last.content) === normalizeText(message)
  ) {
    return history.slice(0, -1);
  }

  return history;
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
    private readonly states: ChatStateStore = new InMemoryChatStateStore(),
  ) {}

  async chat(
    messageValue: string,
    periodValue: unknown = "24h",
    options: ChatRequestOptions = {},
  ): Promise<ChatReply> {
    const message = this.validateMessage(messageValue);
    const requestedPeriod = parseChatPeriod(periodValue);
    const conversationId = parseConversationId(options.conversationId);
    const context = parseChatContext(options.context);
    const history = dropRepeatedCurrentMessage(
      parseChatHistory(options.history),
      message,
    );

    const conversation = this.states.get(conversationId);
    const period = detectPeriodInMessage(message) ?? requestedPeriod;

    const { start, end } = periodBounds(period, this.now());
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // O modelo não consulta o banco: os dados chegam prontos das ferramentas do backend.
    const indicators = await this.indicators.getIndicators(startISO, endISO);
    const activeServices = indicators.services.filter(
      (service) => service.status === "active",
    );
    const serviceNames = activeServices.map((service) => service.name);

    const resolution = resolveServiceReference(
      message,
      activeServices,
      conversation,
      context,
    );

    let degraded = false;

    let classification =
      history.length > 0
        ? await this.llm.classify(message, serviceNames, history)
        : await this.llm.classify(message, serviceNames);

    if (classification === null) {
      classification = classifyByRules(message, resolution);
      degraded = true;
    }

    const merged = this.mergeClassification(
      classification,
      message,
      resolution,
      activeServices,
      conversation,
      context,
    );

    const draft = await this.buildDraft(
      merged,
      period,
      indicators,
      startISO,
      endISO,
      message,
      conversation,
    );

    let answer = draft.answer;
    let usedLlmAnswer = false;

    if (draft.clarification !== null || draft.intent === "OUT_OF_SCOPE") {
      // Recusas e perguntas de clarificação não passam pelo modelo.
      degraded = true;
    } else if (this.llm.enabled) {
      const answerContext = {
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
      };

      const llmHistory = history.slice(-4);
      const llmAnswer =
        llmHistory.length > 0
          ? await this.llm.answer(message, answerContext, llmHistory)
          : await this.llm.answer(message, answerContext);

      if (llmAnswer !== null && llmAnswer.trim() !== "") {
        answer = llmAnswer.trim();
        usedLlmAnswer = true;
      } else {
        degraded = true;
      }
    } else {
      degraded = true;
    }

    const suggestions = this.buildSuggestions(
      draft.intent,
      period,
      draft.activeService,
      draft.clarification !== null,
    );

    this.saveState(conversationId, conversation, message, period, draft);

    return {
      conversationId,
      answer,
      intent: draft.intent,
      period: {
        start: startISO,
        end: endISO,
        label: period,
      },
      chart: draft.chart,
      clarification: draft.clarification,
      suggestions,
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

  private mergeClassification(
    classification: ChatClassification,
    message: string,
    initialResolution: ServiceResolution,
    services: IndicatorService[],
    conversation: ChatConversationState | null,
    context: ChatContext,
  ): MergedClassification {
    const text = normalizeText(message);
    let intent = classification.intent;
    let resolution = initialResolution;
    const hasExplicitService = initialResolution.kind !== "none";
    const dataReference =
      mentionsRanking(text) ||
      initialResolution.kind !== "none" ||
      mentionsEnvironment(text) ||
      mentionsService(text);

    if (intent === "PROJECT_INFO" || intent === "METHODOLOGY") {
      const section = retrieveKnowledge(
        message,
        conversation?.lastQuestion ?? null,
      );

      if (dataReference && !hasStrongKnowledgeCue(text)) {
        // O modelo pode confundir "energia" com explicação; com referência
        // explícita a dados, a intenção de consulta tem prioridade.
        intent = classifyByRules(message, initialResolution).intent;
      } else if (section !== null) {
        intent = section.intent;
      }
    }

    // O classificador pode devolver um nome; ele só vale se existir de fato.
    // Quando a mensagem já é ambígua, o modelo não deve escolher por conta própria.
    if (
      classification.serviceName !== null &&
      initialResolution.kind !== "ambiguous"
    ) {
      const exactMatches = services.filter(
        (service) =>
          normalizeText(service.name) ===
          normalizeText(classification.serviceName ?? ""),
      );

      if (exactMatches.length === 1) {
        resolution = { kind: "unique", service: exactMatches[0] };
      } else if (exactMatches.length > 1) {
        resolution = { kind: "ambiguous", candidates: exactMatches };
      }
    }

    if (intent === "OUT_OF_SCOPE") {
      const knowledgeIntent = classifyKnowledgeByRules(message, dataReference);

      if (knowledgeIntent !== null) {
        intent = knowledgeIntent;
      } else if (mentionsRanking(text) && mentionsEmissions(text)) {
        intent = "RANKING_EMISSIONS";
      } else if (mentionsRanking(text) && mentionsEnergy(text)) {
        intent = "RANKING_ENERGY";
      } else if (
        resolution.kind === "unique" &&
        isServiceOnlyMessage(message, resolution.service.name)
      ) {
        intent = "SERVICE_SUMMARY";
      } else if (mentionsRanking(text)) {
        intent =
          conversation?.lastIntent === "RANKING_EMISSIONS"
            ? "RANKING_EMISSIONS"
            : "RANKING_ENERGY";
      } else if (mentionsEnvironment(text)) {
        intent = "ENVIRONMENT_SUMMARY";
      } else if (mentionsService(text)) {
        intent = "SERVICE_SUMMARY";
      } else if (isContextDependent(text)) {
        const active =
          conversation?.activeService === null ||
          conversation?.activeService === undefined
            ? undefined
            : services.find(
                (service) =>
                  service.serviceId === conversation.activeService?.serviceId,
              );

        if (
          active !== undefined &&
          (mentionsEnergy(text) ||
            mentionsEmissions(text) ||
            isFollowUp(text))
        ) {
          intent = "SERVICE_SUMMARY";
          resolution = { kind: "unique", service: active };
        } else if (
          conversation?.lastIntent !== null &&
          conversation?.lastIntent !== undefined &&
          conversation.lastIntent !== "OUT_OF_SCOPE"
        ) {
          intent = conversation.lastIntent;
        }
      }
    }

    // Um nome de serviço sozinho é um resumo de serviço, não um ranking ou panorama.
    if (
      resolution.kind === "unique" &&
      intent !== "SERVICE_SUMMARY" &&
      isServiceOnlyMessage(message, resolution.service.name)
    ) {
      intent = "SERVICE_SUMMARY";
    }

    // "Ranking" explícito não deve virar resumo só porque o modelo ou o estado
    // apontaram um serviço, desde que a pergunta não cite um serviço de fato.
    if (
      intent === "SERVICE_SUMMARY" &&
      !hasExplicitService &&
      mentionsRanking(text)
    ) {
      if (mentionsEmissions(text) && !mentionsEnergy(text)) {
        intent = "RANKING_EMISSIONS";
      } else if (mentionsEnergy(text) && !mentionsEmissions(text)) {
        intent = "RANKING_ENERGY";
      }
    }

    if (intent === "SERVICE_SUMMARY" && resolution.kind === "none") {
      const contextResolution =
        context.serviceName === null
          ? { kind: "none" as const }
          : resolveServiceFromText(context.serviceName, services);

      const stateService =
        conversation?.activeService === null ||
        conversation?.activeService === undefined
          ? undefined
          : services.find(
              (service) =>
                service.serviceId === conversation.activeService?.serviceId,
            );

      const fallback =
        stateService ??
        (contextResolution.kind === "unique"
          ? contextResolution.service
          : undefined) ??
        (services.length === 1 ? services[0] : undefined);

      if (fallback !== undefined) {
        resolution = { kind: "unique", service: fallback };
      } else if (contextResolution.kind === "ambiguous") {
        resolution = contextResolution;
      }
    }

    return {
      intent,
      service: resolution.kind === "unique" ? resolution.service : null,
      resolution,
      unknownServiceName:
        intent === "SERVICE_SUMMARY" && resolution.kind === "none"
          ? extractRequestedServiceName(message)
          : null,
    };
  }

  private async buildDraft(
    merged: MergedClassification,
    period: ChatPeriod,
    indicators: IndicatorsResult,
    startISO: string,
    endISO: string,
    message: string,
    conversation: ChatConversationState | null,
  ): Promise<ChatDraft> {
    const activeServices = indicators.services.filter(
      (service) => service.status === "active",
    );

    switch (merged.intent) {
      case "RANKING_ENERGY":
      case "RANKING_EMISSIONS":
        return this.buildRanking(merged.intent, period, indicators);

      case "ENVIRONMENT_SUMMARY":
        return this.buildEnvironment(period, startISO, endISO);

      case "PROJECT_INFO":
      case "METHODOLOGY":
        return this.buildKnowledge(
          merged.intent,
          message,
          conversation,
          indicators,
        );

      case "SERVICE_SUMMARY": {
        if (merged.resolution.kind === "ambiguous") {
          return this.buildClarification(
            "Encontrei mais de um serviço com esse nome. Qual deles você quer consultar?",
            merged.resolution.candidates,
            indicators,
          );
        }

        if (
          merged.resolution.kind === "none" &&
          merged.unknownServiceName === null &&
          activeServices.length > 1
        ) {
          return this.buildClarification(
            "Qual serviço você quer consultar?",
            activeServices,
            indicators,
          );
        }

        return this.buildServiceSummary(
          merged.service,
          merged.unknownServiceName,
          period,
          indicators,
          startISO,
          endISO,
        );
      }

      default:
        return buildOutOfScope(indicators);
    }
  }

  private buildKnowledge(
    intent: ChatKnowledgeIntent,
    message: string,
    conversation: ChatConversationState | null,
    indicators: IndicatorsResult,
  ): ChatDraft {
    const section =
      retrieveKnowledge(message, conversation?.lastQuestion ?? null) ??
      fallbackKnowledgeSection(intent);
    const rendered = renderKnowledgeSection(section, indicators.powerModel);

    return {
      intent: rendered.intent,
      answer: rendered.summary,
      chart: null,
      partial: false,
      facts: {
        knowledge: {
          title: rendered.title,
          content: rendered.content,
        },
        powerModel: indicators.powerModel,
        availableServices: indicators.services
          .filter((service) => service.status === "active")
          .map((service) => service.name),
      },
      activeService: null,
      clarification: null,
      clarificationCandidates: [],
    };
  }

  private buildClarification(
    question: string,
    candidates: IndicatorService[],
    indicators: IndicatorsResult,
  ): ChatDraft {
    const visibleCandidates = candidates.slice(
      0,
      MAX_CLARIFICATION_OPTIONS,
    );
    const truncated = candidates.length > visibleCandidates.length;

    const fullQuestion = truncated
      ? `${question} Mostrando ${visibleCandidates.length} de ${candidates.length}; você pode digitar o nome completo do serviço.`
      : question;

    return {
      intent: "SERVICE_SUMMARY",
      answer: fullQuestion,
      chart: null,
      partial: false,
      facts: {
        clarification: true,
        candidates: visibleCandidates.map((service) => ({
          service: service.name,
          serviceId: service.serviceId,
        })),
        availableServices: indicators.services
          .filter((service) => service.status === "active")
          .map((service) => service.name),
      },
      activeService: null,
      clarification: {
        question: fullQuestion,
        options: visibleCandidates.map((service) => ({
          label: service.name,
          message: `Como está o serviço ${service.name}?`,
          serviceName: service.name,
        })),
      },
      clarificationCandidates: candidates.map((service) => ({
        serviceId: service.serviceId,
        name: service.name,
      })),
      };
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
        service,
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
        activeService: null,
        clarification: null,
        clarificationCandidates: [],
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
                `${item.service.name} (${formatNumber(item.value)} ${unit})`,
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
        label: item.service.name,
        value: item.value,
      })),
    };

    return {
      intent,
      answer: `${capitalize(periodPhrase(period))}, o serviço que ${action} foi ${top.service.name}, com ${formatNumber(top.value)} ${unit}.${restText}`,
      chart,
      partial: indicators.summary.isPartial,
      facts: {
        ranking: ranking.map((item) => ({
          service: item.service.name,
          value: item.value,
          unit,
        })),
        activeServiceCount: indicators.summary.activeServiceCount,
        totals: {
          energyKwh: round(indicators.summary.energyKwh),
          emissionsGco2e: round(indicators.summary.emissionsGco2e),
        },
      },
      activeService: {
        serviceId: top.service.serviceId,
        name: top.service.name,
      },
      clarification: null,
      clarificationCandidates: [],
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
      activeService: null,
      clarification: null,
      clarificationCandidates: [],
      };
  }

  private async buildServiceSummary(
    service: IndicatorService | null,
    requestedName: string | null,
    period: ChatPeriod,
    indicators: IndicatorsResult,
    startISO: string,
    endISO: string,
  ): Promise<ChatDraft> {
    if (service === null) {
      const availableServices = indicators.services
        .filter((candidate) => candidate.status === "active")
        .map((candidate) => candidate.name);

      const requested = requestedName === null ? "" : ` "${requestedName}"`;

      return {
        intent: "SERVICE_SUMMARY",
        answer:
          availableServices.length > 0
            ? `Não encontrei o serviço${requested} no catálogo. Os serviços ativos disponíveis são: ${availableServices.join(", ")}.`
            : "Não há serviços ativos cadastrados para consultar.",
        chart: null,
        partial: indicators.summary.isPartial,
        facts: {
          requestedService: requestedName,
          availableServices,
        },
        activeService: null,
        clarification: null,
        clarificationCandidates: [],
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
      activeService: {
        serviceId: service.serviceId,
        name: service.name,
      },
      clarification: null,
      clarificationCandidates: [],
      };
  }

  private buildSuggestions(
    intent: ChatIntent,
    period: ChatPeriod,
    activeService: { serviceId: number; name: string } | null,
    isClarification: boolean,
  ): ChatSuggestion[] {
    if (isClarification) {
      return [];
    }

    const suggestions: ChatSuggestion[] = [];
    const otherPeriod: ChatPeriod = period === "7d" ? "24h" : "7d";
    const otherPeriodLabel =
      otherPeriod === "7d" ? "Ver últimos 7 dias" : "Ver últimas 24 horas";

    const add = (
      label: string,
      message: string,
      suggestionPeriod: ChatPeriod = period,
    ) => {
      if (
        suggestions.some(
          (suggestion) =>
            normalizeText(suggestion.message) === normalizeText(message),
        )
      ) {
        return;
      }

      suggestions.push({ label, message, period: suggestionPeriod });
    };

    switch (intent) {
      case "RANKING_ENERGY":
        add("Ver emissões", "Qual serviço emite mais CO₂ no mesmo período?");
        if (activeService !== null) {
          add(
            `Detalhar ${activeService.name}`,
            `Como está o serviço ${activeService.name}?`,
          );
        }
        add(otherPeriodLabel, "Qual serviço gasta mais energia?", otherPeriod);
        break;

      case "RANKING_EMISSIONS":
        add("Ver energia", "Qual serviço gasta mais energia no mesmo período?");
        if (activeService !== null) {
          add(
            `Detalhar ${activeService.name}`,
            `Como está o serviço ${activeService.name}?`,
          );
        }
        add("Panorama ambiental", "Resumo ambiental do período");
        break;

      case "SERVICE_SUMMARY":
        if (activeService !== null) {
          add("Ver ranking de energia", "Qual serviço gasta mais energia?");
          add(
            `Emissões de ${activeService.name}`,
            `Quanto o serviço ${activeService.name} emitiu?`,
          );
          add(
            otherPeriodLabel,
            `Como está o serviço ${activeService.name}?`,
            otherPeriod,
          );
        } else {
          add("Maior consumo", "Qual serviço gasta mais energia?");
          add("Maiores emissões", "Qual serviço emite mais CO₂?");
          add("Panorama ambiental", "Resumo ambiental do período");
        }
        break;

      case "ENVIRONMENT_SUMMARY":
        add("Maior consumo", "Qual serviço gasta mais energia?");
        add("Maiores emissões", "Qual serviço emite mais CO₂?");
        add(otherPeriodLabel, "Resumo ambiental do período", otherPeriod);
        break;

      case "PROJECT_INFO":
        add("Como as contas funcionam", "Como o GreenER calcula energia e CO₂?");
        add("Funcionalidades", "Quais são as funcionalidades do GreenER?");
        add("Maior consumo", "Qual serviço gasta mais energia?");
        break;

      case "METHODOLOGY":
        add("O que é o GreenER?", "O que é o GreenER?");
        add(
          "Premissas do modelo",
          "O modelo é uma medição física? Quais são as limitações?",
        );
        add("Maior consumo", "Qual serviço gasta mais energia?");
        break;

      case "OUT_OF_SCOPE":
        add("Maior consumo", "Qual serviço gasta mais energia?");
        add("Maiores emissões", "Qual serviço emite mais CO₂?");
        add("Panorama ambiental", "Resumo ambiental do período");
        break;
    }

    return suggestions.slice(0, 3);
  }

  private saveState(
    conversationId: string,
    previous: ChatConversationState | null,
    message: string,
    period: ChatPeriod,
    draft: ChatDraft,
  ): void {
    let activeService: ChatServiceReference | null = null;

    if (draft.activeService !== null) {
      activeService = {
        serviceId: draft.activeService.serviceId,
        serviceName: draft.activeService.name,
      };
    } else if (
      draft.intent === "OUT_OF_SCOPE" ||
      draft.intent === "PROJECT_INFO" ||
      draft.intent === "METHODOLOGY"
    ) {
      activeService = previous?.activeService ?? null;
    }

    const pendingClarification =
      draft.clarification !== null &&
      draft.clarificationCandidates.length > 0
        ? {
            kind: "SERVICE" as const,
            question: draft.clarification.question,
            candidates: draft.clarificationCandidates.map((candidate) => ({
              serviceId: candidate.serviceId,
              serviceName: candidate.name,
            })),
          }
        : null;

    this.states.set({
      conversationId,
      lastIntent: draft.intent,
      activeService,
      activePeriod: period,
      lastQuestion: message,
      pendingClarification,
      updatedAt: Date.now(),
    });
  }
}

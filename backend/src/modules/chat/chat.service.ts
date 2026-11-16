import { createHash, randomUUID } from "node:crypto";
import { AppError } from "../../shared/errors/AppError.js";
import { SingleFlight, TtlCache } from "./chat.cache.js";
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
  type ChatResourceMetric,
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

const REPLY_CACHE_MAX_ENTRIES = 200;
const CLASSIFICATION_CACHE_MAX_ENTRIES = 500;
const INDICATORS_CACHE_MAX_ENTRIES = 16;
const INDICATORS_CACHE_TTL_MS = 15_000;
const REPLY_DATA_CACHE_TTL_MS = 60_000;
const REPLY_KNOWLEDGE_CACHE_TTL_MS = 30 * 60_000;
const REPLY_DEGRADED_CACHE_TTL_MS = 30_000;
const CLASSIFICATION_CACHE_TTL_MS = 30 * 60_000;

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

type ChatServiceHistory = Awaited<
  ReturnType<IndicadoresService["getServiceHistory"]>
>;

type HistorySample = ChatServiceHistory["samples"][number];

function sampleResourceValue(
  sample: HistorySample,
  metric: ChatResourceMetric,
): number | null {
  const metrics = sample.metrics;

  if (metrics === null) {
    return null;
  }

  switch (metric) {
    case "cpu":
      return metrics.cpuPercent;
    case "memory":
      return metrics.memoryGb;
    case "disk":
      return metrics.diskGb;
    case "network":
      return metrics.networkGb;
  }
}

function resourceFacts(service: IndicatorService) {
  const { cpu, memory, disk, network } = service.resourceSummary;

  return {
    cpuAveragePercent:
      cpu.averagePercent === null ? null : round(cpu.averagePercent, 2),
    cpuPeakPercent:
      cpu.peakPercent === null ? null : round(cpu.peakPercent, 2),
    memoryAverageGb:
      memory.averageGb === null ? null : round(memory.averageGb, 2),
    memoryPeakGb: memory.peakGb === null ? null : round(memory.peakGb, 2),
    diskAverageGb: disk.averageGb === null ? null : round(disk.averageGb, 2),
    diskPeakGb: disk.peakGb === null ? null : round(disk.peakGb, 2),
    networkTotalGb:
      network.totalGb === null ? null : round(network.totalGb, 3),
  };
}

function regionalFacts(service: IndicatorService) {
  return {
    regionCode: service.regionalContext.regionCode ?? service.regionCode,
    carbonIntensityGco2ePerKwh:
      service.regionalContext.carbonIntensityGco2ePerKwh,
    renewableSharePercent: service.regionalContext.renewableSharePercent,
  };
}

type ServiceResolution =
  | { kind: "unique"; service: IndicatorService }
  | { kind: "ambiguous"; candidates: IndicatorService[] }
  | { kind: "none" };

// Par de serviços de uma pergunta de comparação.
type ComparisonResolution =
  | { kind: "pair"; first: IndicatorService; second: IndicatorService }
  | { kind: "ambiguous"; candidates: IndicatorService[] }
  | { kind: "partial"; known: IndicatorService }
  | { kind: "none" };

type MergedClassification = {
  intent: ChatIntent;
  service: IndicatorService | null;
  resolution: ServiceResolution;
  comparison: ComparisonResolution;
  metric: ChatResourceMetric | null;
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

type ChatDraftState = Pick<
  ChatDraft,
  "intent" | "activeService" | "clarification" | "clarificationCandidates"
>;

type CachedReply = {
  reply: Omit<ChatReply, "conversationId">;
  draft: ChatDraftState;
};

const DATA_INTENTS = new Set<ChatIntent>([
  "RANKING_ENERGY",
  "RANKING_EMISSIONS",
  "RANKING_RESOURCE",
  "SERVICE_SUMMARY",
  "COMPARE_SERVICES",
  "ENVIRONMENT_SUMMARY",
]);

function isDataIntent(intent: ChatIntent): boolean {
  return DATA_INTENTS.has(intent);
}

function hashHistory(history: ChatHistoryMessage[]): string {
  if (history.length === 0) {
    return "-";
  }

  return createHash("sha1")
    .update(JSON.stringify(history))
    .digest("hex");
}

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

function roundNullable(value: number | null, digits = 2): number | null {
  return value === null ? null : round(value, digits);
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
  return /(mais|maior|menor|menos|rank|ranking|top)/.test(text);
}

// "Quem gastou menos energia?" pede o ranking crescente; o padrão é decrescente.
function mentionsLowest(text: string): boolean {
  return /\b(menor|menores|menos)\b/.test(text);
}

function mentionsComparison(text: string): boolean {
  return /compar|\bversus\b|\bvs\b|\bcontra\b|\bdiferenca/.test(text);
}

// Liga dois nomes de serviço na mesma frase ("A com B", "A vs B", "A contra B").
function hasComparisonConnector(text: string): boolean {
  return /(?:^|[^a-z0-9])(?:x|com|versus|vs|contra)(?:[^a-z0-9]|$)/.test(text);
}

const RESOURCE_METRIC_INFO: Record<
  ChatResourceMetric,
  {
    label: string;
    unit: string;
    noun: string;
    chartTitle: string;
    rankingTitle: string;
  }
> = {
  cpu: {
    label: "CPU",
    unit: "%",
    noun: "uso de CPU",
    chartTitle: "Uso de CPU",
    rankingTitle: "Uso médio de CPU por serviço",
  },
  memory: {
    label: "memória",
    unit: "GB",
    noun: "uso de memória",
    chartTitle: "Uso de memória",
    rankingTitle: "Uso médio de memória por serviço",
  },
  disk: {
    label: "disco",
    unit: "GB",
    noun: "uso de disco",
    chartTitle: "Uso de disco",
    rankingTitle: "Uso médio de disco por serviço",
  },
  network: {
    label: "rede",
    unit: "GB",
    noun: "tráfego de rede",
    chartTitle: "Tráfego de rede",
    rankingTitle: "Tráfego de rede por serviço",
  },
};

function mentionsCpu(text: string): boolean {
  return /\bcpu\b/.test(text);
}

function mentionsMemoryResource(text: string): boolean {
  return /\b(memoria|ram)\b/.test(text);
}

function mentionsDiskResource(text: string): boolean {
  return /\b(disco|disk|armazenamento)\b/.test(text);
}

function mentionsNetworkResource(text: string): boolean {
  return /\b(rede|network|trafego|banda)\b/.test(text);
}

// Energia e emissões já têm intenções próprias; aqui ficam só os recursos.
function detectResourceMetric(text: string): ChatResourceMetric | null {
  if (mentionsCpu(text)) {
    return "cpu";
  }

  if (mentionsMemoryResource(text)) {
    return "memory";
  }

  if (mentionsDiskResource(text)) {
    return "disk";
  }

  if (mentionsNetworkResource(text)) {
    return "network";
  }

  return null;
}

function resourceMetricValue(
  service: IndicatorService,
  metric: ChatResourceMetric,
): number | null {
  switch (metric) {
    case "cpu":
      return service.resourceSummary.cpu.averagePercent;
    case "memory":
      return service.resourceSummary.memory.averageGb;
    case "disk":
      return service.resourceSummary.disk.averageGb;
    case "network":
      return service.resourceSummary.network.totalGb;
  }
}

function resourceMetricPeak(
  service: IndicatorService,
  metric: ChatResourceMetric,
): number | null {
  switch (metric) {
    case "cpu":
      return service.resourceSummary.cpu.peakPercent;
    case "memory":
      return service.resourceSummary.memory.peakGb;
    case "disk":
      return service.resourceSummary.disk.peakGb;
    case "network":
      return null;
  }
}

function roundResourceValue(
  value: number,
  metric: ChatResourceMetric,
): number {
  return metric === "network" ? round(value, 4) : round(value, 2);
}

function formatResourceValue(
  value: number,
  metric: ChatResourceMetric,
): string {
  const rounded = formatNumber(roundResourceValue(value, metric));

  return RESOURCE_METRIC_INFO[metric].unit === "%"
    ? `${rounded}%`
    : `${rounded} GB`;
}

// Agregados de rede somam muitas amostras; duas casas mantêm o texto legível.
function formatResourceTotal(
  value: number,
  metric: ChatResourceMetric,
): string {
  const rounded = formatNumber(
    metric === "network" ? round(value, 2) : roundResourceValue(value, metric),
  );

  return RESOURCE_METRIC_INFO[metric].unit === "%"
    ? `${rounded}%`
    : `${rounded} GB`;
}

// Trecho usado em respostas: "uso médio de 12,3% (pico de 45,6%)".
function resourceUsagePhrase(
  value: number,
  peak: number | null,
  metric: ChatResourceMetric,
): string {
  const base =
    metric === "network"
      ? `tráfego total de ${formatResourceTotal(value, metric)}`
      : `uso médio de ${formatResourceValue(value, metric)}`;

  return peak === null
    ? base
    : `${base} (pico de ${formatResourceValue(peak, metric)})`;
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

// Diferente de resolveServiceFromText, devolve todos os serviços citados na
// mensagem, na ordem em que aparecem — necessário para comparações. Nomes
// parciais só entram quando a pergunta é de comparação (includePartialTokens),
// para "serviço Solar" continuar ambíguo em vez de virar um par.
function matchServicesInOrder(
  message: string,
  services: IndicatorService[],
  includePartialTokens: boolean = false,
): IndicatorService[] {
  const normalized = normalizeText(message);
  const found: Array<{
    service: IndicatorService;
    start: number;
    end: number;
  }> = [];

  for (const service of services) {
    const name = normalizeText(service.name);

    if (name.length < 2 || !containsWholePhrase(normalized, name)) {
      continue;
    }

    const start = normalized.indexOf(name);
    found.push({ service, start, end: start + name.length });
  }

  // "Alpha" e "Alpha Beta" casam juntos; o nome mais específico fica.
  const kept: typeof found = [];

  for (const entry of [...found].sort(
    (left, right) =>
      right.end - right.start - (left.end - left.start),
  )) {
    const overlaps = kept.some(
      (other) => entry.start < other.end && other.start < entry.end,
    );

    if (!overlaps) {
      kept.push(entry);
    }
  }

  if (!includePartialTokens) {
    return kept
      .sort((left, right) => left.start - right.start)
      .map((entry) => entry.service);
  }

  const tokenOffsets = [...normalized.matchAll(/[a-z0-9]+/g)].map((match) => ({
    token: match[0],
    offset: match.index ?? 0,
  }));

  const unmatched = services.filter(
    (service) =>
      !kept.some((entry) => entry.service.serviceId === service.serviceId),
  );

  // Nomes parciais: aceita apenas os que mais casam tokens, como em matchByTokens.
  const partialMatches = unmatched.map((service) => {
    const tokens = new Set(serviceNameTokens(service.name));
    const hits = tokenOffsets.filter((item) => tokens.has(item.token));

    return { service, score: hits.length, start: hits[0]?.offset ?? -1 };
  });
  const bestScore = Math.max(0, ...partialMatches.map((item) => item.score));

  if (bestScore > 0) {
    for (const item of partialMatches) {
      if (item.score === bestScore) {
        kept.push({
          service: item.service,
          start: item.start,
          end: item.start + 1,
        });
      }
    }
  }

  return kept
    .sort((left, right) => left.start - right.start)
    .map((entry) => entry.service);
}

function buildComparisonResolution(
  matches: IndicatorService[],
  named: Array<string | null>,
  services: IndicatorService[],
  conversation: ChatConversationState | null,
  context: ChatContext,
): ComparisonResolution {
  const pair: IndicatorService[] = [...matches];

  const push = (service: IndicatorService | undefined) => {
    if (
      service === undefined ||
      pair.some((candidate) => candidate.serviceId === service.serviceId)
    ) {
      return;
    }

    pair.push(service);
  };

  for (const name of named) {
    if (name === null) {
      continue;
    }

    const normalized = normalizeText(name);
    push(
      services.find(
        (service) => normalizeText(service.name) === normalized,
      ),
    );
  }

  // Continuações: "compare com o Beta" usa o serviço ativo da conversa.
  if (pair.length < 2 && conversation?.activeService != null) {
    push(
      services.find(
        (service) =>
          service.serviceId === conversation.activeService?.serviceId,
      ),
    );
  }

  if (pair.length < 2 && context.serviceName !== null) {
    const contextResolution = resolveServiceFromText(
      context.serviceName,
      services,
    );

    if (contextResolution.kind === "unique") {
      push(contextResolution.service);
    }
  }

  if (pair.length >= 3) {
    return { kind: "ambiguous", candidates: pair };
  }

  if (pair.length === 2) {
    return { kind: "pair", first: pair[0], second: pair[1] };
  }

  if (pair.length === 1) {
    return { kind: "partial", known: pair[0] };
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
  services: IndicatorService[],
): ChatClassification {
  const text = normalizeText(message);
  const ranking = mentionsRanking(text);
  const emissions = mentionsEmissions(text);
  const energy = mentionsEnergy(text);
  const metric = detectResourceMetric(text);
  const explicitMatches = matchServicesInOrder(message, services);
  const comparisonMatches = mentionsComparison(text)
    ? matchServicesInOrder(message, services, true)
    : explicitMatches;
  const dataReference =
    ranking ||
    resolution.kind !== "none" ||
    metric !== null ||
    mentionsEnvironment(text) ||
    mentionsService(text);

  const knowledgeIntent = classifyKnowledgeByRules(message, dataReference);

  if (knowledgeIntent !== null) {
    return {
      intent: knowledgeIntent,
      serviceName: null,
      compareWith: null,
      metric: null,
    };
  }

  if (
    mentionsComparison(text) &&
    (comparisonMatches.length >= 1 ||
      resolution.kind !== "none" ||
      mentionsService(text))
  ) {
    return {
      intent: "COMPARE_SERVICES",
      serviceName: null,
      compareWith: null,
      metric,
    };
  }

  // "Alpha vs Beta" não usa a palavra comparação, mas liga dois serviços.
  if (explicitMatches.length >= 2 && hasComparisonConnector(text)) {
    return {
      intent: "COMPARE_SERVICES",
      serviceName: null,
      compareWith: null,
      metric,
    };
  }

  if (ranking && metric !== null) {
    return {
      intent: "RANKING_RESOURCE",
      serviceName: null,
      compareWith: null,
      metric,
    };
  }

  if (ranking && emissions) {
    return {
      intent: "RANKING_EMISSIONS",
      serviceName: null,
      compareWith: null,
      metric: null,
    };
  }

  if (ranking && energy) {
    return {
      intent: "RANKING_ENERGY",
      serviceName: null,
      compareWith: null,
      metric: null,
    };
  }

  if (resolution.kind === "unique") {
    return {
      intent: "SERVICE_SUMMARY",
      serviceName: resolution.service.name,
      compareWith: null,
      metric,
    };
  }

  if (resolution.kind === "ambiguous") {
    return {
      intent: "SERVICE_SUMMARY",
      serviceName: null,
      compareWith: null,
      metric,
    };
  }

  // "Qual o uso de CPU?" sem nome ainda é resumo de serviço, completado
  // pelo serviço ativo da conversa ou por uma clarificação.
  if (metric !== null) {
    return {
      intent: "SERVICE_SUMMARY",
      serviceName: null,
      compareWith: null,
      metric,
    };
  }

  if (mentionsEnvironment(text)) {
    return {
      intent: "ENVIRONMENT_SUMMARY",
      serviceName: null,
      compareWith: null,
      metric: null,
    };
  }

  if (mentionsService(text)) {
    return {
      intent: "SERVICE_SUMMARY",
      serviceName: null,
      compareWith: null,
      metric: null,
    };
  }

  return {
    intent: "OUT_OF_SCOPE",
    serviceName: null,
    compareWith: null,
    metric: null,
  };
}

// As regras só dispensam o classificador quando a intenção é sustentada por
// sinais explícitos. Casos duvidosos (OUT_OF_SCOPE, "serviço" genérico) ainda
// passam pelo modelo.
function isRulesClassificationConfident(
  message: string,
  resolution: ServiceResolution,
  classification: ChatClassification,
  services: IndicatorService[],
): boolean {
  const text = normalizeText(message);

  switch (classification.intent) {
    case "RANKING_ENERGY":
    case "RANKING_EMISSIONS":
    case "RANKING_RESOURCE":
    case "ENVIRONMENT_SUMMARY":
    case "PROJECT_INFO":
    case "METHODOLOGY":
      return true;

    case "COMPARE_SERVICES":
      return (
        matchServicesInOrder(message, services, true).length >= 1 ||
        resolution.kind !== "none"
      );

    case "SERVICE_SUMMARY":
      return (
        resolution.kind !== "none" ||
        mentionsEnergy(text) ||
        mentionsEmissions(text) ||
        detectResourceMetric(text) !== null
      );

    default:
      return false;
  }
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
      'Consigo responder apenas perguntas sobre os dados monitorados pelo GreenER, como energia, emissões, CPU, memória, disco, rede, ranking, comparação entre serviços e disponibilidade. Por exemplo: "Qual o uso de CPU do serviço Alpha?", "Qual serviço usa mais memória?", "Compare a rede do serviço Alpha com o serviço Beta" ou "Resumo ambiental das últimas 24 horas".',
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
  private readonly replies: TtlCache<string, CachedReply>;
  private readonly classifications: TtlCache<string, ChatClassification>;
  private readonly indicatorsCache: TtlCache<ChatPeriod, IndicatorsResult>;
  private readonly inFlight: SingleFlight<string, CachedReply>;

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
  ) {
    const nowMs = () => this.now().getTime();

    this.replies = new TtlCache<string, CachedReply>(
      REPLY_CACHE_MAX_ENTRIES,
      nowMs,
    );
    this.classifications = new TtlCache<string, ChatClassification>(
      CLASSIFICATION_CACHE_MAX_ENTRIES,
      nowMs,
    );
    this.indicatorsCache = new TtlCache<ChatPeriod, IndicatorsResult>(
      INDICATORS_CACHE_MAX_ENTRIES,
      nowMs,
    );
    this.inFlight = new SingleFlight<string, CachedReply>();
  }

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
    const cacheKey = this.replyCacheKey(
      message,
      period,
      context,
      history,
      conversation,
    );

    if (cacheKey !== null) {
      const cached = this.replies.get(cacheKey);

      if (cached !== null) {
        this.saveState(
          conversationId,
          conversation,
          message,
          cached.reply.period.label,
          cached.draft,
        );

        return { conversationId, ...cached.reply };
      }
    }

    const compute = () =>
      this.computeReply(message, period, context, history, conversation);

    const computed =
      cacheKey === null
        ? await compute()
        : await this.inFlight.run(cacheKey, async () => {
            const result = await compute();
            this.replies.set(cacheKey, result, this.replyTtl(result.reply));
            return result;
          });

    this.saveState(
      conversationId,
      conversation,
      message,
      computed.reply.period.label,
      computed.draft,
    );

    return { conversationId, ...computed.reply };
  }

  private async computeReply(
    message: string,
    period: ChatPeriod,
    context: ChatContext,
    history: ChatHistoryMessage[],
    conversation: ChatConversationState | null,
  ): Promise<CachedReply> {
    const { start, end } = periodBounds(period, this.now());
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // O modelo não consulta o banco: os dados chegam prontos das ferramentas do backend.
    const indicators = await this.getIndicatorsCached(
      period,
      startISO,
      endISO,
    );
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

    // Regras primeiro: o classificador só é chamado quando elas não decidem.
    const rulesClassification = classifyByRules(
      message,
      resolution,
      activeServices,
    );
    let classification = rulesClassification;
    let classificationFailed = !this.llm.enabled;

    if (
      !isRulesClassificationConfident(
        message,
        resolution,
        rulesClassification,
        activeServices,
      )
    ) {
      const llmClassification = await this.classifyCached(
        message,
        serviceNames,
        history,
      );

      if (llmClassification !== null) {
        classification = llmClassification;
        classificationFailed = false;
      } else {
        classificationFailed = true;
      }
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
    let degraded = false;

    if (draft.clarification !== null || draft.intent === "OUT_OF_SCOPE") {
      // Recusas e perguntas de clarificação não passam pelo modelo.
      degraded = true;
    } else if (isDataIntent(draft.intent)) {
      // Respostas de dados são determinísticas por decisão de projeto: o modelo
      // só entra aqui quando as regras precisaram de ajuda para classificar.
      degraded = !this.llm.enabled || classificationFailed;
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

    return {
      reply: {
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
      },
      draft: {
        intent: draft.intent,
        activeService: draft.activeService,
        clarification: draft.clarification,
        clarificationCandidates: draft.clarificationCandidates,
      },
    };
  }

  private replyCacheKey(
    message: string,
    period: ChatPeriod,
    context: ChatContext,
    history: ChatHistoryMessage[],
    conversation: ChatConversationState | null,
  ): string | null {
    const text = normalizeText(message);
    const pending = conversation?.pendingClarification;

    // Continuações dependem do estado da conversa e não entram no cache.
    if (pending !== null && pending !== undefined) {
      return null;
    }

    if (isFollowUp(text) || isContextDependent(text)) {
      return null;
    }

    // Perguntas de conhecimento usam a pergunta anterior como dica de
    // recuperação; ela entra na chave para não misturar contextos.
    const knowledgeHint =
      retrieveKnowledge(message) === null
        ? "-"
        : normalizeText(conversation?.lastQuestion ?? "-");

    // Comparações podem completar o par com o serviço ativo da conversa, então
    // a chave inclui esse serviço para não devolver o par de outra conversa.
    const comparisonService =
      mentionsComparison(text) || /\b(versus|vs|contra)\b/.test(text)
        ? (conversation?.activeService?.serviceId ?? "-")
        : "-";

    return [
      text,
      period,
      context.serviceName === null ? "-" : normalizeText(context.serviceName),
      hashHistory(history),
      knowledgeHint,
      comparisonService,
    ].join("|");
  }

  private replyTtl(reply: Omit<ChatReply, "conversationId">): number {
    if (reply.degraded) {
      return REPLY_DEGRADED_CACHE_TTL_MS;
    }

    if (reply.intent === "PROJECT_INFO" || reply.intent === "METHODOLOGY") {
      return REPLY_KNOWLEDGE_CACHE_TTL_MS;
    }

    return REPLY_DATA_CACHE_TTL_MS;
  }

  private async classifyCached(
    message: string,
    serviceNames: string[],
    history: ChatHistoryMessage[],
  ): Promise<ChatClassification | null> {
    if (!this.llm.enabled) {
      return null;
    }

    const key = [
      normalizeText(message),
      serviceNames.map(normalizeText).sort().join(","),
      hashHistory(history),
    ].join("|");
    const cached = this.classifications.get(key);

    if (cached !== null) {
      return cached;
    }

    const classification =
      history.length > 0
        ? await this.llm.classify(message, serviceNames, history)
        : await this.llm.classify(message, serviceNames);

    if (classification !== null) {
      this.classifications.set(
        key,
        classification,
        CLASSIFICATION_CACHE_TTL_MS,
      );
    }

    return classification;
  }

  private async getIndicatorsCached(
    period: ChatPeriod,
    startISO: string,
    endISO: string,
  ): Promise<IndicatorsResult> {
    const cached = this.indicatorsCache.get(period);

    if (cached !== null) {
      return cached;
    }

    const indicators = await this.indicators.getIndicators(
      startISO,
      endISO,
    );
    this.indicatorsCache.set(period, indicators, INDICATORS_CACHE_TTL_MS);

    return indicators;
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
    const metric = detectResourceMetric(text) ?? classification.metric ?? null;
    const dataReference =
      mentionsRanking(text) ||
      initialResolution.kind !== "none" ||
      metric !== null ||
      mentionsEnvironment(text) ||
      mentionsService(text);

    const explicitMatches = matchServicesInOrder(message, services);
    const comparisonCue =
      mentionsComparison(text) ||
      (explicitMatches.length >= 2 && hasComparisonConnector(text));
    const comparison = buildComparisonResolution(
      comparisonCue
        ? matchServicesInOrder(message, services, true)
        : explicitMatches,
      classification.intent === "COMPARE_SERVICES"
        ? [classification.serviceName, classification.compareWith]
        : [null, null],
      services,
      conversation,
      context,
    );

    if (intent === "PROJECT_INFO" || intent === "METHODOLOGY") {
      const section = retrieveKnowledge(
        message,
        conversation?.lastQuestion ?? null,
      );

      if (dataReference && !hasStrongKnowledgeCue(text)) {
        // O modelo pode confundir "energia" com explicação; com referência
        // explícita a dados, a intenção de consulta tem prioridade.
        intent = classifyByRules(message, initialResolution, services).intent;
      } else if (section !== null) {
        intent = section.intent;
      }
    }

    // Dois serviços citados com sinal de comparação viram comparação direta,
    // mesmo que o modelo tenha escolhido resumo, ranking ou fora de escopo.
    if (
      comparison.kind === "pair" &&
      intent !== "PROJECT_INFO" &&
      intent !== "METHODOLOGY" &&
      comparisonCue
    ) {
      intent = "COMPARE_SERVICES";
    }

    // Ranking com recurso explícito ("mais CPU") tem intenção própria.
    if (mentionsRanking(text) && metric !== null && !hasExplicitService) {
      intent = "RANKING_RESOURCE";
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
      } else if (mentionsRanking(text) && metric !== null) {
        intent = "RANKING_RESOURCE";
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
      } else if (metric !== null) {
        intent = "SERVICE_SUMMARY";
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
      comparison,
      metric,
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
        return this.buildRanking(
          merged.intent,
          period,
          indicators,
          mentionsLowest(normalizeText(message)),
        );

      case "RANKING_RESOURCE": {
        const metric = merged.metric;

        return metric === null
          ? this.buildRanking(
              "RANKING_ENERGY",
              period,
              indicators,
              mentionsLowest(normalizeText(message)),
            )
          : this.buildResourceRanking(
              metric,
              period,
              indicators,
              mentionsLowest(normalizeText(message)),
            );
      }

      case "ENVIRONMENT_SUMMARY":
        return this.buildEnvironment(period, startISO, endISO);

      case "COMPARE_SERVICES":
        return this.buildComparison(
          merged.comparison,
          period,
          indicators,
          merged.metric,
        );

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
          merged.metric,
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
    lowest: boolean,
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
      .sort((left, right) =>
        lowest ? left.value - right.value : right.value - left.value,
      )
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
          order: lowest ? "asc" : "desc",
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
      ? lowest
        ? "consumiu menos energia"
        : "consumiu mais energia"
      : lowest
        ? "emitiu menos CO₂ equivalente"
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
        ? lowest
          ? "Menor consumo de energia por serviço"
          : "Consumo de energia por serviço"
        : lowest
          ? "Menores emissões por serviço"
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
        order: lowest ? "asc" : "desc",
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

  private buildResourceRanking(
    metric: ChatResourceMetric,
    period: ChatPeriod,
    indicators: IndicatorsResult,
    lowest: boolean,
  ): ChatDraft {
    const info = RESOURCE_METRIC_INFO[metric];

    const ranking = indicators.services
      .filter((service) => service.status === "active")
      .map((service) => ({
        service,
        value: resourceMetricValue(service, metric),
      }))
      .filter(
        (item): item is { service: IndicatorService; value: number } =>
          item.value !== null && item.value > 0,
      )
      .map((item) => ({
        service: item.service,
        value: roundResourceValue(item.value, metric),
      }))
      .sort((left, right) =>
        lowest ? left.value - right.value : right.value - left.value,
      )
      .slice(0, MAX_RANKING_ITEMS);

    if (ranking.length === 0) {
      return {
        intent: "RANKING_RESOURCE",
        answer: `Não encontrei dados de ${info.noun} registrados ${periodPhrase(period)} para os serviços ativos. Isso pode acontecer quando não houve coletas no período.`,
        chart: null,
        partial: indicators.summary.isPartial,
        facts: {
          ranking: [],
          metric,
          unit: info.unit,
          order: lowest ? "asc" : "desc",
          activeServiceCount: indicators.summary.activeServiceCount,
        },
        activeService: null,
        clarification: null,
        clarificationCandidates: [],
      };
    }

    const [top, ...rest] = ranking;
    const restText =
      rest.length > 0
        ? ` Em seguida aparecem ${rest
            .map(
              (item) =>
                `${item.service.name} (${formatResourceValue(item.value, metric)})`,
            )
            .join(", ")}.`
        : "";

    const chart: ChatChart = {
      type: "bar",
      title: info.rankingTitle,
      unit: info.unit,
      data: ranking.map((item) => ({
        label: item.service.name,
        value: item.value,
      })),
    };

    return {
      intent: "RANKING_RESOURCE",
      answer: `${capitalize(periodPhrase(period))}, o serviço com ${lowest ? "menor" : "maior"} ${info.noun} foi ${top.service.name}, com ${formatResourceValue(top.value, metric)}.${restText}`,
      chart,
      partial: indicators.summary.isPartial,
      facts: {
        ranking: ranking.map((item) => ({
          service: item.service.name,
          value: item.value,
          unit: info.unit,
        })),
        metric,
        order: lowest ? "asc" : "desc",
        activeServiceCount: indicators.summary.activeServiceCount,
      },
      activeService: {
        serviceId: top.service.serviceId,
        name: top.service.name,
      },
      clarification: null,
      clarificationCandidates: [],
    };
  }

  private buildComparison(
    comparison: ComparisonResolution,
    period: ChatPeriod,
    indicators: IndicatorsResult,
    metric: ChatResourceMetric | null,
  ): ChatDraft {
    const availableServices = indicators.services
      .filter((service) => service.status === "active")
      .map((service) => service.name);

    if (comparison.kind !== "pair") {
      const candidateNames =
        comparison.kind === "ambiguous"
          ? comparison.candidates.map((service) => service.name)
          : comparison.kind === "partial"
            ? [comparison.known.name]
            : [];

      let answer: string;

      if (comparison.kind === "ambiguous") {
        answer = `Encontrei mais de dois serviços na pergunta (${candidateNames.join(", ")}). Diga apenas dois nomes, por exemplo: "Compare ${candidateNames[0]} com ${candidateNames[1]}".`;
      } else if (comparison.kind === "partial") {
        const other = availableServices.find(
          (name) => name !== comparison.known.name,
        );

        answer =
          other === undefined
            ? `Encontrei apenas o serviço ${comparison.known.name}, e não há outro serviço ativo para comparar.`
            : `Encontrei apenas o serviço ${comparison.known.name}. Para comparar, informe o outro serviço. Exemplo: "Compare ${comparison.known.name} com ${other}".`;
      } else {
        answer =
          availableServices.length >= 2
            ? `Para comparar, informe dois serviços. Os serviços ativos são: ${availableServices.join(", ")}. Exemplo: "Compare ${availableServices[0]} com ${availableServices[1]}".`
            : "Não há serviços ativos suficientes para comparar.";
      }

      return {
        intent: "COMPARE_SERVICES",
        answer,
        chart: null,
        partial: indicators.summary.isPartial,
        facts: {
          candidates: candidateNames,
          availableServices,
        },
        activeService:
          comparison.kind === "partial"
            ? {
                serviceId: comparison.known.serviceId,
                name: comparison.known.name,
              }
            : null,
        clarification: null,
        clarificationCandidates: [],
      };
    }

    const first = comparison.first;
    const second = comparison.second;
    const partial = first.periodTotals.isPartial || second.periodTotals.isPartial;
    const partialNote = partial
      ? " Os dados de pelo menos um dos serviços são parciais por lacunas de coleta no período."
      : "";

    const summarize = (service: IndicatorService) => ({
      name: service.name,
      energyKwh: round(service.periodTotals.energyKwh),
      emissionsGco2e: round(service.periodTotals.emissionsGco2e),
      collectionCount: service.periodTotals.collectionCount,
      validMetricCount: service.periodTotals.validMetricCount,
      metricCoveragePercent: round(
        service.periodTotals.metricCoveragePercent,
        2,
      ),
      ...regionalFacts(service),
      ...resourceFacts(service),
      energyBreakdown: {
        cpuKwh: roundNullable(service.energyBreakdown.cpuKwh),
        memoryKwh: roundNullable(service.energyBreakdown.memoryKwh),
        diskKwh: roundNullable(service.energyBreakdown.diskKwh),
        networkKwh: roundNullable(service.energyBreakdown.networkKwh),
      },
      isPartial: service.periodTotals.isPartial,
    });

    if (metric !== null) {
      const info = RESOURCE_METRIC_INFO[metric];
      const firstValue = resourceMetricValue(first, metric);
      const secondValue = resourceMetricValue(second, metric);

      if (firstValue === null || secondValue === null) {
        const missing = [
          firstValue === null ? first.name : null,
          secondValue === null ? second.name : null,
        ].filter((name): name is string => name !== null);

        return {
          intent: "COMPARE_SERVICES",
          answer: `Não encontrei dados de ${info.noun} para ${missing.join(" e ")} ${periodPhrase(period)}, então não é possível comparar os dois serviços.${partialNote}`,
          chart: null,
          partial,
          facts: {
            comparison: {
              metric,
              first: summarize(first),
              second: summarize(second),
              firstValue: null,
              secondValue: null,
            },
          },
          activeService: {
            serviceId: first.serviceId,
            name: first.name,
          },
          clarification: null,
          clarificationCandidates: [],
        };
      }

      const firstRounded = roundResourceValue(firstValue, metric);
      const secondRounded = roundResourceValue(secondValue, metric);
      const firstPeak = resourceMetricPeak(first, metric);
      const secondPeak = resourceMetricPeak(second, metric);
      const firstPeakRounded =
        firstPeak === null ? null : roundResourceValue(firstPeak, metric);
      const secondPeakRounded =
        secondPeak === null ? null : roundResourceValue(secondPeak, metric);

      const higher = firstRounded >= secondRounded ? first : second;
      const lower = higher === first ? second : first;
      const difference = roundResourceValue(
        Math.abs(firstRounded - secondRounded),
        metric,
      );
      const percent =
        Math.min(firstRounded, secondRounded) > 0
          ? round(
              (difference / Math.min(firstRounded, secondRounded)) * 100,
              2,
            )
          : null;

      const deltaSentence =
        difference === 0
          ? `O ${info.noun} ficou empatado entre os dois serviços.`
          : `${higher.name} registrou ${metric === "cpu" ? `${formatNumber(difference)} pontos percentuais` : formatResourceTotal(difference, metric)} a mais que ${lower.name}${metric === "cpu" || percent === null ? "" : `, ${formatNumber(percent)}% acima`}.`;

      const chart: ChatChart = {
        type: "bar",
        title: `${info.chartTitle} — ${first.name} vs ${second.name}`,
        unit: info.unit,
        data: [
          { label: first.name, value: firstRounded },
          { label: second.name, value: secondRounded },
        ],
      };

      return {
        intent: "COMPARE_SERVICES",
        answer: `${capitalize(periodPhrase(period))}, ${first.name} registrou ${resourceUsagePhrase(firstRounded, firstPeakRounded, metric)}, enquanto ${second.name} registrou ${resourceUsagePhrase(secondRounded, secondPeakRounded, metric)}. ${deltaSentence}${partialNote}`,
        chart,
        partial,
        facts: {
          comparison: {
            metric,
            first: summarize(first),
            second: summarize(second),
            firstValue: firstRounded,
            secondValue: secondRounded,
            difference,
            percentDifference: percent,
          },
        },
        activeService: {
          serviceId: first.serviceId,
          name: first.name,
        },
        clarification: null,
        clarificationCandidates: [],
      };
    }

    const firstEnergy = round(first.periodTotals.energyKwh);
    const secondEnergy = round(second.periodTotals.energyKwh);
    const firstEmissions = round(first.periodTotals.emissionsGco2e);
    const secondEmissions = round(second.periodTotals.emissionsGco2e);

    const energyHigher = firstEnergy >= secondEnergy ? first : second;
    const energyLower = energyHigher === first ? second : first;
    const energyDifference = round(Math.abs(firstEnergy - secondEnergy));
    const energyPercent =
      Math.min(firstEnergy, secondEnergy) > 0
        ? round(
            (energyDifference / Math.min(firstEnergy, secondEnergy)) * 100,
            2,
          )
        : null;

    const emissionsHigher = firstEmissions >= secondEmissions ? first : second;
    const emissionsLower = emissionsHigher === first ? second : first;
    const emissionsDifference = round(
      Math.abs(firstEmissions - secondEmissions),
    );
    const emissionsPercent =
      Math.min(firstEmissions, secondEmissions) > 0
        ? round(
            (emissionsDifference / Math.min(firstEmissions, secondEmissions)) *
              100,
            2,
          )
        : null;

    const energySentence =
      energyDifference === 0
        ? "O consumo de energia ficou empatado entre os dois serviços."
        : energyPercent === null
          ? `${energyHigher.name} consumiu ${formatNumber(energyDifference)} kWh a mais que ${energyLower.name}.`
          : `${energyHigher.name} consumiu ${formatNumber(energyDifference)} kWh a mais, ${formatNumber(energyPercent)}% acima de ${energyLower.name}.`;

    const emissionsSentence =
      emissionsDifference === 0
        ? "As emissões também ficaram empatadas."
        : emissionsPercent === null
          ? `${emissionsHigher.name} emitiu ${formatNumber(emissionsDifference)} gCO₂e a mais que ${emissionsLower.name}.`
          : `${emissionsHigher.name} emitiu ${formatNumber(emissionsDifference)} gCO₂e a mais, ${formatNumber(emissionsPercent)}% acima de ${emissionsLower.name}.`;

    const chart: ChatChart = {
      type: "bar",
      title: `Consumo de energia — ${first.name} vs ${second.name}`,
      unit: "kWh",
      data: [
        { label: first.name, value: firstEnergy },
        { label: second.name, value: secondEnergy },
      ],
    };

    return {
      intent: "COMPARE_SERVICES",
      answer: `${capitalize(periodPhrase(period))}, ${first.name} consumiu ${formatNumber(firstEnergy)} kWh e emitiu ${formatNumber(firstEmissions)} gCO₂e, enquanto ${second.name} consumiu ${formatNumber(secondEnergy)} kWh e emitiu ${formatNumber(secondEmissions)} gCO₂e. ${energySentence} ${emissionsSentence}${partialNote}`,
      chart,
      partial,
      facts: {
        comparison: {
          first: summarize(first),
          second: summarize(second),
          energyDifferenceKwh: energyDifference,
          emissionsDifferenceGco2e: emissionsDifference,
        },
      },
      activeService: {
        serviceId: first.serviceId,
        name: first.name,
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
    metric: ChatResourceMetric | null,
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

    const partialNote = totals.isPartial
      ? " Os dados são parciais porque há lacunas de coleta ou de intensidade de carbono no período."
      : "";

    if (metric !== null) {
      const info = RESOURCE_METRIC_INFO[metric];
      const rawValue = resourceMetricValue(service, metric);
      const rawPeak = resourceMetricPeak(service, metric);
      const chartData: ChatChartPoint[] = [];

      for (let index = 0; index < history.samples.length; index += stride) {
        const bucket = history.samples.slice(index, index + stride);
        const sample = bucket[bucket.length - 1];
        const sampleValue = sampleResourceValue(sample, metric);

        chartData.push({
          label: formatSampleLabel(sample.attemptedAt, period),
          value:
            sampleValue === null
              ? null
              : roundResourceValue(sampleValue, metric),
        });
      }

      const chart: ChatChart | null = chartData.some(
        (point) => point.value !== null,
      )
        ? {
            type: "line",
            title: `${info.chartTitle} — ${service.name}`,
            unit: info.unit,
            data: chartData,
          }
        : null;

      if (rawValue === null) {
        return {
          intent: "SERVICE_SUMMARY",
          answer: `Não encontrei dados de ${info.noun} para o serviço ${service.name} ${periodPhrase(period)}. Isso pode acontecer quando não houve coletas com métricas válidas no período.`,
          chart,
          partial: totals.isPartial,
          facts: {
            service: {
              name: service.name,
              status: service.status,
              regionCode: service.regionCode,
            },
            metric,
            resources: resourceFacts(service),
          },
          activeService: {
            serviceId: service.serviceId,
            name: service.name,
          },
          clarification: null,
          clarificationCandidates: [],
        };
      }

      const value = roundResourceValue(rawValue, metric);
      const peak =
        rawPeak === null ? null : roundResourceValue(rawPeak, metric);

      return {
        intent: "SERVICE_SUMMARY",
        answer: `${capitalize(periodPhrase(period))}, o serviço ${service.name} registrou ${resourceUsagePhrase(value, peak, metric)}, com ${totals.validMetricCount} de ${totals.collectionCount} coletas com métricas válidas.${partialNote}`,
        chart,
        partial: totals.isPartial,
        facts: {
          service: {
            name: service.name,
            status: service.status,
            regionCode: service.regionCode,
          },
          metric,
          metricValue: value,
          metricPeak: peak,
          resources: resourceFacts(service),
          regionalContext: regionalFacts(service),
          collectionCount: totals.collectionCount,
          validMetricCount: totals.validMetricCount,
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

    const chart: ChatChart | null =
      chartData.length > 0
        ? {
            type: "line",
            title: `Consumo de energia — ${service.name}`,
            unit: "kWh",
            data: chartData,
          }
        : null;

    const resourceParts: string[] = [];
    const { cpu, memory, disk, network } = service.resourceSummary;

    if (cpu.averagePercent !== null) {
      resourceParts.push(
        `CPU média de ${formatResourceValue(cpu.averagePercent, "cpu")}${
          cpu.peakPercent === null
            ? ""
            : ` (pico de ${formatResourceValue(cpu.peakPercent, "cpu")})`
        }`,
      );
    }

    if (memory.averageGb !== null) {
      resourceParts.push(
        `memória média de ${formatResourceValue(memory.averageGb, "memory")}${
          memory.peakGb === null
            ? ""
            : ` (pico de ${formatResourceValue(memory.peakGb, "memory")})`
        }`,
      );
    }

    if (disk.averageGb !== null) {
      resourceParts.push(
        `disco médio de ${formatResourceValue(disk.averageGb, "disk")}${
          disk.peakGb === null
            ? ""
            : ` (pico de ${formatResourceValue(disk.peakGb, "disk")})`
        }`,
      );
    }

    if (network.totalGb !== null) {
      resourceParts.push(
        `tráfego de rede de ${formatResourceTotal(network.totalGb, "network")}`,
      );
    }

    const resourceSentence =
      resourceParts.length > 0
        ? ` No período, a leitura de recursos mostrou ${resourceParts.join(", ")}.`
        : "";

    const region = service.regionalContext;
    const regionSentence =
      region.carbonIntensityGco2ePerKwh === null
        ? ""
        : ` A região ${region.regionCode ?? service.regionCode} tem intensidade de carbono de ${formatNumber(region.carbonIntensityGco2ePerKwh)} gCO₂e/kWh${
            region.renewableSharePercent === null
              ? ""
              : ` e ${formatNumber(region.renewableSharePercent)}% de matriz renovável`
          }.`;

    return {
      intent: "SERVICE_SUMMARY",
      answer: `${capitalize(periodPhrase(period))}, o serviço ${service.name} consumiu ${formatNumber(round(totals.energyKwh))} kWh e emitiu ${formatNumber(round(totals.emissionsGco2e))} gCO₂e, com ${totals.validMetricCount} de ${totals.collectionCount} coletas com métricas válidas.${resourceSentence}${regionSentence}${partialNote}`,
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
        resources: resourceFacts(service),
        regionalContext: regionalFacts(service),
        energyBreakdown: {
          cpuKwh: roundNullable(service.energyBreakdown.cpuKwh),
          memoryKwh: roundNullable(service.energyBreakdown.memoryKwh),
          diskKwh: roundNullable(service.energyBreakdown.diskKwh),
          networkKwh: roundNullable(service.energyBreakdown.networkKwh),
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

      case "RANKING_RESOURCE":
        add("Ver energia", "Qual serviço gasta mais energia no mesmo período?");
        add("Maiores emissões", "Qual serviço emite mais CO₂?");
        if (activeService !== null) {
          add(
            `Detalhar ${activeService.name}`,
            `Como está o serviço ${activeService.name}?`,
          );
        }
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

      case "COMPARE_SERVICES":
        if (activeService !== null) {
          add(
            `Detalhar ${activeService.name}`,
            `Como está o serviço ${activeService.name}?`,
          );
        }
        add("Ver ranking de energia", "Qual serviço gasta mais energia?");
        add("Panorama ambiental", "Resumo ambiental do período");
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
    draft: ChatDraftState,
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

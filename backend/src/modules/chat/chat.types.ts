export const CHAT_PERIODS = ["1h", "6h", "24h", "7d"] as const;

export type ChatPeriod = (typeof CHAT_PERIODS)[number];

export const CHAT_INTENTS = [
  "RANKING_ENERGY",
  "RANKING_EMISSIONS",
  "RANKING_RESOURCE",
  "SERVICE_SUMMARY",
  "SERVICE_LOCATION",
  "COMPARE_SERVICES",
  "LOCATION_IMPACT",  
  "ENVIRONMENT_SUMMARY",
  "PROJECT_INFO",
  "METHODOLOGY",
  "OUT_OF_SCOPE",
] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];

// Recursos medidos por serviço, além de energia e emissões.
export const CHAT_RESOURCE_METRICS = [
  "cpu",
  "memory",
  "disk",
  "network",
] as const;

export type ChatResourceMetric = (typeof CHAT_RESOURCE_METRICS)[number];

export type ChatClassification = {
  intent: ChatIntent;
  serviceName: string | null;
  // Segundo serviço de uma comparação ("compare A com B").
  compareWith: string | null;
  // Recurso pedido explicitamente ("cpu", "memória", "disco", "rede").
  metric: ChatResourceMetric | null;
};

export type ChatChartPoint = {
  label: string;
  value: number | null;
};

export type ChatChart = {
  type: "bar" | "line";
  title: string;
  unit: string;
  data: ChatChartPoint[];
};

export type ChatContext = {
  page: string | null;
  serviceName: string | null;
};

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatClarificationOption = {
  label: string;
  message: string;
  serviceName: string | null;
};

export type ChatClarification = {
  question: string;
  options: ChatClarificationOption[];
};

export type ChatSuggestion = {
  label: string;
  message: string;
  period: ChatPeriod;
};

export type ChatRequestOptions = {
  conversationId?: unknown;
  userId?: string;
  context?: unknown;
  history?: unknown;
};

export type ChatReply = {
  conversationId: string;
  answer: string;
  intent: ChatIntent;
  period: {
    start: string;
    end: string;
    label: ChatPeriod;
  };
  chart: ChatChart | null;
  clarification: ChatClarification | null;
  suggestions: ChatSuggestion[];
  partial: boolean;
  disclaimer: string;
  model: string;
  degraded: boolean;
};

export interface ChatLlm {
  readonly enabled: boolean;
  readonly model: string;
  classify(
    message: string,
    serviceNames: string[],
    history?: ChatHistoryMessage[],
  ): Promise<ChatClassification | null>;
  answer(
    question: string,
    context: unknown,
    history?: ChatHistoryMessage[],
  ): Promise<string | null>;
}

export const CHAT_PERIODS = ["1h", "6h", "24h", "7d"] as const;

export type ChatPeriod = (typeof CHAT_PERIODS)[number];

export type ChatIntent =
  | "RANKING_ENERGY"
  | "RANKING_EMISSIONS"
  | "SERVICE_SUMMARY"
  | "ENVIRONMENT_SUMMARY"
  | "PROJECT_INFO"
  | "METHODOLOGY"
  | "OUT_OF_SCOPE";

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

export type ChatRequest = {
  message: string;
  period: ChatPeriod;
  conversationId?: string;
  context?: ChatContext;
  history?: ChatHistoryMessage[];
};

export type ChatResponse = {
  message: string;
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

export const CHAT_PERIODS = ["1h", "6h", "24h", "7d"] as const;

export type ChatPeriod = (typeof CHAT_PERIODS)[number];

export const CHAT_INTENTS = [
  "RANKING_ENERGY",
  "RANKING_EMISSIONS",
  "SERVICE_SUMMARY",
  "ENVIRONMENT_SUMMARY",
  "OUT_OF_SCOPE",
] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];

export type ChatClassification = {
  intent: ChatIntent;
  serviceName: string | null;
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

export type ChatReply = {
  answer: string;
  intent: ChatIntent;
  period: {
    start: string;
    end: string;
    label: ChatPeriod;
  };
  chart: ChatChart | null;
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
  ): Promise<ChatClassification | null>;
  answer(question: string, context: unknown): Promise<string | null>;
}

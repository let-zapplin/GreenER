export const CHAT_PERIODS = ["1h", "6h", "24h", "7d"] as const;

export type ChatPeriod = (typeof CHAT_PERIODS)[number];

export type ChatIntent =
  | "RANKING_ENERGY"
  | "RANKING_EMISSIONS"
  | "SERVICE_SUMMARY"
  | "ENVIRONMENT_SUMMARY"
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

export type ChatRequest = {
  message: string;
  period: ChatPeriod;
};

export type ChatResponse = {
  message: string;
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

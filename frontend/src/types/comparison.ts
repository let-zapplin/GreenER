import type { IndicatorGapReason } from "./indicators";

export type ComparisonMetric =
  | "energy"
  | "emissions"
  | "cpu"
  | "memory"
  | "disk"
  | "network";

  export type ComparisonVisualization =
  | "timeline"
  | "period";

export type ComparisonPoint = {
  collectionId: string;
  attemptedAt: string;
  timestampMs: number;

  value: number | null;

  gapReason: IndicatorGapReason | null;

  temporalGap?: boolean;
};

export type ComparisonSeries = {
  serviceId: number;
  name: string;
  status: string;
  regionCode: string;

  points: ComparisonPoint[];
};


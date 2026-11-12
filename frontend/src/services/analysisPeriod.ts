export type AnalysisPeriodOption = {
  label: string;
  value: number;
};

export type AnalysisPeriodWindow = {
  start: string;
  end: string;
  durationMs: number;
};

export const ANALYSIS_PERIODS: AnalysisPeriodOption[] = [
  { label: "1h", value: 1 * 60 * 60 * 1000 },
  { label: "6h", value: 6 * 60 * 60 * 1000 },
  { label: "24h", value: 24 * 60 * 60 * 1000 },
  { label: "7d", value: 7 * 24 * 60 * 60 * 1000 },
];

export const DEFAULT_ANALYSIS_PERIOD_MS =
  24 * 60 * 60 * 1000;

export function isSupportedAnalysisPeriod(
  periodMs: number,
): boolean {
  return ANALYSIS_PERIODS.some(
    (period) => period.value === periodMs,
  );
}

export function createAnalysisPeriodWindow(
  durationMs: number,
  endTimestamp = Date.now(),
): AnalysisPeriodWindow {
  const end = new Date(endTimestamp);

  const start = new Date(
    endTimestamp - durationMs,
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    durationMs,
  };
}
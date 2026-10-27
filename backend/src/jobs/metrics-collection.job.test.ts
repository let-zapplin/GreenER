import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startMetricsCollection } from "./metrics-collection.job.js";

const { collectAllMetricsMock } = vi.hoisted(() => ({
  collectAllMetricsMock: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  env: { metricsCollectionIntervalMs: 60_000 },
}));

vi.mock("../modules/coletas/coletas.service.js", () => ({
  MetricaService: class {
    collectAllMetrics = collectAllMetricsMock;
  },
}));

const emptySummary = {
  skipped: false,
  services: 0,
  success: 0,
  noMetrics: 0,
  errors: 0,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("startMetricsCollection", () => {
  it("executa a coleta imediatamente e repete no intervalo configurado", async () => {
    collectAllMetricsMock.mockResolvedValue(emptySummary);

    await startMetricsCollection();
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(59_999);
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(2);
  });

  it("mantém o ciclo automático mesmo quando uma coleta falha", async () => {
    collectAllMetricsMock
      .mockRejectedValueOnce(new Error("falha na coleta"))
      .mockResolvedValue(emptySummary);

    await startMetricsCollection();
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(2);
  });
});

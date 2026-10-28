import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startMetricsCollection } from "./metrics-collection.job.js";

const { collectAllMetricsMock } = vi.hoisted(() => ({
  collectAllMetricsMock: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  env: { metricsCollectionIntervalMs: 60_000 },
}));

vi.mock("../modules/coletas/coletas.service.js", () => ({
  ColetasService: class {
    collectAllMetrics = collectAllMetricsMock;
  },
}));

const emptySummary = {
  skipped: false,
  totalServices: 0,
  successCount: 0,
  noMetricsCount: 0,
  unavailableCount: 0,
  errorCount: 0,
  failures: [],
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

  it("registra o intervalo configurado e o número de cada ciclo no log", async () => {
    collectAllMetricsMock.mockResolvedValue(emptySummary);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await startMetricsCollection();
    await vi.advanceTimersByTimeAsync(60_000);

    const logs = logSpy.mock.calls.map(([message]) => String(message));

    expect(logs).toContainEqual(
      expect.stringContaining("intervalo de 60000 ms"),
    );
    expect(logs).toContainEqual(expect.stringContaining("coleta automática #1"));
    expect(logs).toContainEqual(expect.stringContaining("coleta automática #2"));

    logSpy.mockRestore();
  });
});

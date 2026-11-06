import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startCarbonIntensitySync } from "./carbon-intensity-sync.job.js";

const { saveIntensityMock } = vi.hoisted(() => ({
  saveIntensityMock: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  env: { carbonIntensitySyncIntervalMs: 300_000 },
}));

vi.mock("../modules/intensidades/intensidades.service.js", () => ({
  IntensidadesService: class {
    saveIntensity = saveIntensityMock;
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("startCarbonIntensitySync", () => {
  it("sincroniza imediatamente e repete no intervalo configurado", async () => {
    saveIntensityMock.mockResolvedValue({ inserted: 5 });

    await startCarbonIntensitySync();
    expect(saveIntensityMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(299_999);
    expect(saveIntensityMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(saveIntensityMock).toHaveBeenCalledTimes(2);
  });

  it("mantém o ciclo automático após uma falha", async () => {
    saveIntensityMock
      .mockRejectedValueOnce(new Error("carbon api indisponível"))
      .mockResolvedValue({ inserted: 5 });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await startCarbonIntensitySync();
    expect(saveIntensityMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(300_000);
    expect(saveIntensityMock).toHaveBeenCalledTimes(2);

    errorSpy.mockRestore();
  });

  it("registra o intervalo e o número de snapshots inseridos", async () => {
    saveIntensityMock.mockResolvedValue({ inserted: 5 });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await startCarbonIntensitySync();

    const logs = logSpy.mock.calls.map(([message]) => String(message));

    expect(logs).toContainEqual(
      expect.stringContaining("intervalo de 300000 ms"),
    );
    expect(logs).toContainEqual(
      expect.stringContaining("5 snapshots inseridos"),
    );

    logSpy.mockRestore();
  });
});

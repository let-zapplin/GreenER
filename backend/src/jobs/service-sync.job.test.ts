import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startServiceSync } from "./service-sync.job.js";

const { saveServicesMock } = vi.hoisted(() => ({
  saveServicesMock: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  env: { serviceSyncIntervalMs: 300_000 },
}));

vi.mock("../modules/servicos/servicos.service.js", () => ({
  ServicosService: class {
    saveServices = saveServicesMock;
  },
}));

const emptyResult = { created: 0, updated: 0, removed: 0 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("startServiceSync", () => {
  it("executa a descoberta imediatamente e repete no intervalo configurado", async () => {
    saveServicesMock.mockResolvedValue(emptyResult);

    await startServiceSync();
    expect(saveServicesMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(299_999);
    expect(saveServicesMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(saveServicesMock).toHaveBeenCalledTimes(2);
  });

  it("mantém o ciclo automático mesmo quando uma descoberta falha", async () => {
    saveServicesMock
      .mockRejectedValueOnce(new Error("metrics api indisponível"))
      .mockResolvedValue(emptyResult);

    await startServiceSync();
    expect(saveServicesMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(300_000);
    expect(saveServicesMock).toHaveBeenCalledTimes(2);
  });

  it("não inicia um novo ciclo enquanto o anterior não termina", async () => {
    let resolveSave: (value: typeof emptyResult) => void = () => {};
    saveServicesMock.mockImplementation(
      () =>
        new Promise<typeof emptyResult>((resolve) => {
          resolveSave = resolve;
        }),
    );

    const firstRun = startServiceSync();

    // O tempo passa, mas o ciclo atual ainda está pendente.
    await vi.advanceTimersByTimeAsync(300_000);
    expect(saveServicesMock).toHaveBeenCalledTimes(1);

    saveServicesMock.mockResolvedValue(emptyResult);
    resolveSave(emptyResult);
    await firstRun;

    await vi.advanceTimersByTimeAsync(300_000);
    expect(saveServicesMock).toHaveBeenCalledTimes(2);
  });

  it("registra o intervalo configurado e o número de cada ciclo no log", async () => {
    saveServicesMock.mockResolvedValue(emptyResult);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await startServiceSync();
    await vi.advanceTimersByTimeAsync(300_000);

    const logs = logSpy.mock.calls.map(([message]) => String(message));

    expect(logs).toContainEqual(
      expect.stringContaining("intervalo de 300000 ms"),
    );
    expect(logs).toContainEqual(expect.stringContaining("descoberta automática #1"));
    expect(logs).toContainEqual(expect.stringContaining("descoberta automática #2"));

    logSpy.mockRestore();
  });
});

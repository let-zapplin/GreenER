import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startMetricsCollection } from "./metrics-collection.job.js";

// Testa o agendamento real do job, substituindo a coleta para não acessar APIs ou banco.
// vi.hoisted cria o mock antes das fábricas de vi.mock, que são antecipadas pelo Vitest.
const { collectAllMetricsMock } = vi.hoisted(() => ({
  collectAllMetricsMock: vi.fn(),
}));

// Fixa o intervalo em um minuto, independentemente do .env da aplicação.
vi.mock("../config/env.js", () => ({
  env: { metricsCollectionIntervalMs: 60_000 },
}));

// A instância de ColetasService criada pelo job utiliza este método simulado.
vi.mock("../modules/coletas/coletas.service.js", () => ({
  ColetasService: class {
    collectAllMetrics = collectAllMetricsMock;
  },
}));

// Resumo conhecido de um ciclo concluído sem serviços e sem falhas.
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
  // Limpa chamadas e comportamentos dos mocks e controla o relógio para evitar espera real.
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  // Remove os próximos ciclos agendados antes de restaurar os temporizadores reais.
  // Assim, o agendamento de um cenário não continua durante os seguintes.
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("startMetricsCollection", () => {
  it("executa a coleta imediatamente e repete no intervalo configurado", async () => {
    collectAllMetricsMock.mockResolvedValue(emptySummary);

    // A primeira coleta ocorre ao iniciar o job, sem esperar o intervalo.
    await startMetricsCollection();
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(1);

    // Antes de completar um minuto, a coleta ainda deve ter sido chamada apenas uma vez.
    await vi.advanceTimersByTimeAsync(59_999);
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(1);

    // O milissegundo restante completa o prazo e dispara o segundo ciclo.
    await vi.advanceTimersByTimeAsync(1);
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(2);
  });

  it("mantém o ciclo automático mesmo quando uma coleta falha", async () => {
    // A primeira chamada rejeita; as seguintes resolvem com o resumo conhecido.
    collectAllMetricsMock
      .mockRejectedValueOnce(new Error("falha na coleta"))
      .mockResolvedValue(emptySummary);

    // O job captura a falha: sua inicialização termina e o próximo ciclo é agendado.
    // A mensagem de console.error desse cenário é esperada.
    await startMetricsCollection();
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(collectAllMetricsMock).toHaveBeenCalledTimes(2);
  });

  it("registra o intervalo configurado e o número de cada ciclo no log", async () => {
    collectAllMetricsMock.mockResolvedValue(emptySummary);
    // Captura as mensagens sem imprimi-las no terminal durante este cenário.
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Executa o primeiro ciclo e avança o relógio para executar o segundo.
    await startMetricsCollection();
    await vi.advanceTimersByTimeAsync(60_000);

    // Extrai o primeiro argumento de cada chamada de console.log para conferir seu texto.
    const logs = logSpy.mock.calls.map(([message]) => String(message));

    // Verifica a divulgação do intervalo e a identificação sequencial dos dois ciclos.
    expect(logs).toContainEqual(
      expect.stringContaining("intervalo de 60000 ms"),
    );
    expect(logs).toContainEqual(expect.stringContaining("coleta automática #1"));
    expect(logs).toContainEqual(expect.stringContaining("coleta automática #2"));

    // Devolve console.log à implementação original ao terminar a verificação.
    logSpy.mockRestore();
  });
});

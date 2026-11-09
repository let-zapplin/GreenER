import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startServiceSync } from "./service-sync.job.js";

// Testa o agendamento real do job, mas simula a sincronização para não acessar API ou banco.
// vi.hoisted disponibiliza o mock para a fábrica de vi.mock antecipada pelo Vitest.
const { saveServicesMock } = vi.hoisted(() => ({
  saveServicesMock: vi.fn(),
}));

// Fixa o intervalo em cinco minutos, sem depender da configuração real da aplicação.
vi.mock("../config/env.js", () => ({
  env: { serviceSyncIntervalMs: 300_000 },
}));

// A instância criada pelo job utiliza saveServices simulado no lugar da sincronização real.
vi.mock("../modules/servicos/servicos.service.js", () => ({
  ServicosService: class {
    saveServices = saveServicesMock;
  },
}));

// Resultado conhecido de uma sincronização sem alterações no catálogo.
const emptyResult = { created: 0, updated: 0, removed: 0 };

beforeEach(() => {
  // Limpa chamadas e comportamentos dos mocks e controla o relógio para não esperar de verdade.
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  // Descarta os próximos ciclos agendados antes de restaurar os temporizadores reais.
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("startServiceSync", () => {
  it("executa a descoberta imediatamente e repete no intervalo configurado", async () => {
    saveServicesMock.mockResolvedValue(emptyResult);

    // A primeira sincronização ocorre ao iniciar o job, sem aguardar cinco minutos.
    await startServiceSync();
    expect(saveServicesMock).toHaveBeenCalledTimes(1);

    // Um milissegundo antes do prazo, nenhuma segunda chamada deve ter ocorrido.
    await vi.advanceTimersByTimeAsync(299_999);
    expect(saveServicesMock).toHaveBeenCalledTimes(1);

    // Completa o intervalo e confirma o início do segundo ciclo.
    await vi.advanceTimersByTimeAsync(1);
    expect(saveServicesMock).toHaveBeenCalledTimes(2);
  });

  it("mantém o ciclo automático mesmo quando uma descoberta falha", async () => {
    // A primeira sincronização falha; as seguintes devolvem um resultado válido.
    saveServicesMock
      .mockRejectedValueOnce(new Error("metrics api indisponível"))
      .mockResolvedValue(emptyResult);

    await startServiceSync();
    expect(saveServicesMock).toHaveBeenCalledTimes(1);

    // Mesmo após a falha, o job agenda outra execução. O console.error do cenário é esperado.
    await vi.advanceTimersByTimeAsync(300_000);
    expect(saveServicesMock).toHaveBeenCalledTimes(2);
  });

  it("não inicia um novo ciclo enquanto o anterior não termina", async () => {
    // Guarda a função resolve para concluir manualmente a sincronização quando o teste decidir.
    let resolveSave: (value: typeof emptyResult) => void = () => {};
    saveServicesMock.mockImplementation(
      () =>
        new Promise<typeof emptyResult>((resolve) => {
          resolveSave = resolve;
        }),
    );

    // Não usa await aqui: a primeira execução precisa permanecer pendente para testar sobreposição.
    const firstRun = startServiceSync();

    // O tempo passa, mas o ciclo atual ainda está pendente.
    await vi.advanceTimersByTimeAsync(300_000);
    expect(saveServicesMock).toHaveBeenCalledTimes(1);

    // Prepara o resultado das chamadas futuras e conclui a Promise da primeira chamada.
    // Alterar o mock sozinho não resolve a Promise que já estava pendente.
    saveServicesMock.mockResolvedValue(emptyResult);
    resolveSave(emptyResult);
    await firstRun;

    // O intervalo do próximo ciclo só começa depois que o anterior termina.
    await vi.advanceTimersByTimeAsync(300_000);
    expect(saveServicesMock).toHaveBeenCalledTimes(2);
  });

  it("registra o intervalo configurado e o número de cada ciclo no log", async () => {
    saveServicesMock.mockResolvedValue(emptyResult);
    // Captura as mensagens sem imprimi-las no terminal durante este teste.
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Executa dois ciclos para verificar a identificação sequencial nos logs.
    await startServiceSync();
    await vi.advanceTimersByTimeAsync(300_000);

    // Extrai o primeiro argumento de cada chamada de console.log para comparar os textos.
    const logs = logSpy.mock.calls.map(([message]) => String(message));

    // Confere a divulgação do intervalo e os números do primeiro e do segundo ciclo.
    expect(logs).toContainEqual(
      expect.stringContaining("intervalo de 300000 ms"),
    );
    expect(logs).toContainEqual(expect.stringContaining("descoberta automática #1"));
    expect(logs).toContainEqual(expect.stringContaining("descoberta automática #2"));

    // Restaura a implementação original de console.log após as verificações.
    logSpy.mockRestore();
  });
});

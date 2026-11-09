import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchMetricResult } from "../../integrations/metrics-api.js";

// Simula pool, cliente, consultas e liberação da conexão; nenhum SQL é executado no banco.
// Os testes conferem os comandos e parâmetros solicitados pelo repository real.
const { connectMock, queryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
}));

vi.mock("../../db/connection.js", () => ({
  default: {
    connect: connectMock,
  },
}));

import { ColetasRepository } from "./coletas.repository.js";

describe("ColetasRepository.saveCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // O cliente simulado oferece os mesmos métodos usados pelo repository: query e release.
    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

  // As quatro respostas representam BEGIN, INSERT da tentativa com ID 42,
  // INSERT das métricas e COMMIT, nessa ordem.
  it("grava coleta e métricas na mesma transação", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_collection: 42 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const result: FetchMetricResult = {
      status: "success",
      data: {
        cpu_percent: 12.5,
        memory_gb: 4,
        disk_gb: 80,
        network_gb: 6,
        collection_interval_seconds: 45,
        recorded_at: "2026-10-26T00:00:00.000Z",
      },
    };

    await new ColetasRepository().saveCollection(7, result);

    // Confere a sequência da transação; as verificações seguintes conferem os valores parametrizados.
    expect(queryMock.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      expect.stringContaining("INSERT INTO collection"),
      expect.stringContaining("INSERT INTO metrics"),
      "COMMIT",
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO collection"),
      [7, "success", null, null],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO metrics"),
      [42, 12.5, 4, 80, 6, 45, "2026-10-26T00:00:00.000Z"],
    );
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  // Indisponibilidade deve inserir a tentativa e seu motivo, sem pedir INSERT em metrics.
  it("grava o motivo técnico quando o serviço está indisponível", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_collection: 9 }] })
      .mockResolvedValueOnce({ rows: [] });

    await new ColetasRepository().saveCollection(3, {
      status: "unavailable",
      failure_reason: "A consulta à API de métricas excedeu o tempo limite.",
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO collection"),
      [
        3,
        "unavailable",
        "A consulta à API de métricas excedeu o tempo limite.",
        null,
      ],
    );
    expect(
      queryMock.mock.calls.some(([sql]) =>
        String(sql).includes("INSERT INTO metrics"),
      ),
    ).toBe(false);
    expect(queryMock).toHaveBeenLastCalledWith("COMMIT");
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  // no_metrics preserva o HTTP 404 na tentativa e não deve solicitar gravação de métricas.
  it("grava coleta sem métricas com status próprio, sem inserir dados em metrics", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_collection: 11 }] })
      .mockResolvedValueOnce({ rows: [] });

    await new ColetasRepository().saveCollection(5, {
      status: "no_metrics",
      http_status: 404,
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO collection"),
      [5, "no_metrics", null, 404],
    );
    expect(
      queryMock.mock.calls.some(([sql]) =>
        String(sql).includes("INSERT INTO metrics"),
      ),
    ).toBe(false);
    expect(queryMock).toHaveBeenLastCalledWith("COMMIT");
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  // Simula sucesso de BEGIN, falha do INSERT e outra falha no ROLLBACK.
  // Confirma a propagação do erro original e a liberação do cliente mesmo assim.
  it("preserva o erro original se a gravação e o rollback falharem", async () => {
    const saveError = new Error("insert failed");
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(saveError)
      .mockRejectedValueOnce(new Error("rollback failed"));

    await expect(
      new ColetasRepository().saveCollection(7, {
        status: "no_metrics",
        http_status: 404,
      }),
    ).rejects.toBe(saveError);
    expect(queryMock).toHaveBeenNthCalledWith(3, "ROLLBACK");
    expect(releaseMock).toHaveBeenCalledOnce();
  });
});

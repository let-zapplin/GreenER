import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchMetricResult } from "../../integrations/metrics-api.js";

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
    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

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
        recorded_at: "2026-10-26T00:00:00.000Z",
      },
    };

    await new ColetasRepository().saveCollection(7, result);

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
      [42, 12.5, 4, 80, 6, "2026-10-26T00:00:00.000Z"],
    );
    expect(releaseMock).toHaveBeenCalledOnce();
  });

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

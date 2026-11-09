import { beforeEach, describe, expect, it, vi } from "vitest";

// Substitui pool.query: verifica o mapeamento do resultado e trechos do SQL,
// sem executar a consulta em PostgreSQL real.
const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("../../db/connection.js", () => ({
  default: {
    query: queryMock,
  },
}));

import { DashboardRepository } from "./dashboard.repository.js";

describe("DashboardRepository.countServicesByAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Fornece contagens conhecidas no formato do banco para conferir o retorno em camelCase.
  it("conta categorias disjuntas somente entre serviços ativos do catálogo", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          active_service_count: 3,
          no_metrics_service_count: 1,
          unavailable_service_count: 2,
        },
      ],
    });

    await expect(
      new DashboardRepository().countServicesByAvailability(),
    ).resolves.toEqual({
      activeServiceCount: 3,
      noMetricsServiceCount: 1,
      unavailableServiceCount: 2,
    });

    // Confere filtros de catálogo, classificação da última coleta e ordenação usada
    // para escolher a tentativa mais recente. Não comprova a contagem com dados reais.
    const [sql] = queryMock.mock.calls[0];
    expect(sql).toContain("WHERE s.status = 'active'");
    expect(sql).toContain("latest_collection.status IN ('success', 'error')");

    expect(sql).toContain("latest_collection.status = 'no_metrics'");

    expect(sql).toContain("latest_collection.status = 'unavailable'");
    expect(sql).not.toContain(
      "latest_collection.status IN ('unavailable', 'error')",
    );
    expect(sql).toContain("ORDER BY c.attempted_at DESC, c.id_collection DESC");
  });
});

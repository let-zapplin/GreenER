import { beforeEach, describe, expect, it, vi } from "vitest";

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

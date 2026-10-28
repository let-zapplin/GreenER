import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());

vi.mock("../../db/connection.js", () => ({
  default: { query },
}));

import { IntensidadesRepository } from "./intensidades.repository.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IntensidadesRepository", () => {
  it("não consulta snapshots sem idade máxima definida", async () => {
    const repository = new IntensidadesRepository();

    await expect(repository.findForCollection("12")).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("seleciona um snapshot regional anterior à coleta e dentro do limite", async () => {
    const snapshot = {
      id_carbon_intensity: 9,
      region_code: "br-sudeste",
      carbon_intensity_gco2e_per_kwh: 85,
      renewable_share_percent: 83,
    };
    query.mockResolvedValue({ rows: [snapshot] });
    const repository = new IntensidadesRepository();

    await expect(repository.findForCollection("12", 60_000)).resolves.toEqual(snapshot);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("factor_location.region_code = service_location.region_code");
    expect(sql).toContain("c.registered_at <= co.attempted_at");
    expect(sql).toContain("co.attempted_at - ($2::double precision * INTERVAL '1 millisecond')");
    expect(sql).toContain("c.renewable_share_percent");
    expect(params).toEqual(["12", 60_000]);
  });

  it("procura localização regional sem selecionar uma cidade arbitrária", async () => {
    const location = { id_location: 42, region_code: "br-sudeste", city: null };
    query.mockResolvedValue({ rows: [location] });
    const repository = new IntensidadesRepository();

    await expect(repository.findLocationByRegion("br-sudeste")).resolves.toEqual(location);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("city IS NULL");
    expect(sql).toContain("ORDER BY id_location");
    expect(params).toEqual(["br-sudeste"]);
  });
});
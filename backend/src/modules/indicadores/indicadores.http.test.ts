import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { createToken } from "../../shared/utils/jwt.util.js";
import { IndicadoresRepository } from "./indicadores.repository.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("HTTP dos indicadores", () => {
  it("retorna 401 ao consultar indicadores sem token", async () => {
    const response = await request(app).get("/api/indicadores").query({
      start: "2026-11-01T00:00:00.000Z",
      end: "2026-11-02T00:00:00.000Z",
    });

    expect(response.status).toBe(401);
  });

  it("retorna 400 quando não informa o período", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_INDICATOR_PERIOD");
    expect(consultarIndicadores).not.toHaveBeenCalled();
  });
});

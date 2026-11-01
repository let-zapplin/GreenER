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
  it("retorna 400 quando a data inicial é inválida", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "data-invalida",
        end: "2026-11-02T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_INDICATOR_PERIOD");
    expect(consultarIndicadores).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a data final é anterior à inicial", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "2026-11-02T00:00:00.000Z",
        end: "2026-11-01T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_INDICATOR_PERIOD");
    expect(consultarIndicadores).not.toHaveBeenCalled();
  });

  it("retorna 400 quando as datas inicial e final são iguais", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "2026-11-01T00:00:00.000Z",
        end: "2026-11-01T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_INDICATOR_PERIOD");
    expect(consultarIndicadores).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a data inicial é enviada duas vezes", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: ["2026-11-01T00:00:00.000Z", "2026-11-02T00:00:00.000Z"],
        end: "2026-11-03T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_INDICATOR_PERIOD");
    expect(consultarIndicadores).not.toHaveBeenCalled();
  });

  it("retorna 401 ao consultar indicadores com token inválido", async () => {
    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockResolvedValue([]);

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", "Bearer token-invalido")
      .query({
        start: "2026-11-01T00:00:00.000Z",
        end: "2026-11-02T00:00:00.000Z",
      });

    expect(response.status).toBe(401);
    expect(consultarIndicadores).not.toHaveBeenCalled();
  });

  it("retorna 200 com indicadores quando token e período são válidos", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const start = "2026-11-01T00:00:00.000Z";
    const end = "2026-11-02T00:00:00.000Z";

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", `Bearer ${token}`)
      .query({ start, end });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      message: "Indicadores calculados",
      period: {
        start,
        end,
      },
      summary: {
        serviceCount: 0,
        collectionCount: 0,
        energyKwh: 0,
        emissionsGco2e: 0,
        isPartial: true,
      },
      services: [],
    });

    expect(consultarIndicadores).toHaveBeenCalledTimes(1);

    const argumentos = consultarIndicadores.mock.calls[0];

    expect(argumentos[0]).toEqual(new Date(start));
    expect(argumentos[1]).toEqual(new Date(end));
  });

  it("retorna 500 quando a consulta aos indicadores falha", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockRejectedValue(new Error("Falha simulada na conexão com o banco"));

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "2026-11-01T00:00:00.000Z",
        end: "2026-11-02T00:00:00.000Z",
      });

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      error: "Erro interno do servidor",
      code: "INTERNAL_ERROR",
    });

    expect(consultarIndicadores).toHaveBeenCalledTimes(1);
  });
});

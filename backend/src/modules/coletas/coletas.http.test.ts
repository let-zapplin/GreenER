import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { createToken } from "../../shared/utils/jwt.util.js";
import { ColetasRepository } from "./coletas.repository.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("HTTP do histórico de coletas", () => {
  it("retorna 401 quando não recebe token", async () => {
    const response = await request(app).get("/api/metricas/historico/1");

    expect(response.status).toBe(401);
  });

  it("retorna 401 quando recebe token inválido", async () => {
    const response = await request(app)
      .get("/api/metricas/historico/1")
      .set("Authorization", "Bearer token-invalido");

    expect(response.status).toBe(401);
  });

  it("retorna o histórico quando recebe token válido", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarHistorico = vi
      .spyOn(ColetasRepository.prototype, "findHistoryByService")
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/metricas/historico/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      service_id: 1,
      collections: [],
    });

    expect(consultarHistorico).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("retorna 400 quando o ID do serviço é inválido", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarHistorico = vi
      .spyOn(ColetasRepository.prototype, "findHistoryByService")
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/metricas/historico/abc")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(consultarHistorico).not.toHaveBeenCalled();
  });
});

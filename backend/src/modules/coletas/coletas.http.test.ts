import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app.js";

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
});

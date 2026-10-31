import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app.js";

describe("HTTP do histórico de coletas", () => {
  it("retorna 401 quando não recebe token", async () => {
    const response = await request(app).get("/api/metricas/historico/1");

    expect(response.status).toBe(401);
  });
});

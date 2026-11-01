import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app.js";

describe("HTTP dos indicadores", () => {
  it("retorna 401 ao consultar indicadores sem token", async () => {
    const response = await request(app).get("/api/indicadores").query({
      start: "2026-11-01T00:00:00.000Z",
      end: "2026-11-02T00:00:00.000Z",
    });

    expect(response.status).toBe(401);
  });
});

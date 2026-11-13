import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { createToken } from "../../shared/utils/jwt.util.js";
import { DashboardRepository } from "../dashboard/dashboard.repository.js";
import { IndicadoresRepository } from "../indicadores/indicadores.repository.js";
import { OllamaClient } from "./ollama.client.js";

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
  vi.stubEnv("JWT_EXPIRES_IN", "15m");

  // Nenhum teste HTTP acessa PostgreSQL ou o Ollama real.
  vi.spyOn(
    IndicadoresRepository.prototype,
    "findCollectionsForPeriod",
  ).mockResolvedValue([]);

  vi.spyOn(
    DashboardRepository.prototype,
    "countServicesByAvailability",
  ).mockResolvedValue({
    activeServiceCount: 0,
    noMetricsServiceCount: 0,
    unavailableServiceCount: 0,
  });

  vi.spyOn(OllamaClient.prototype, "classify").mockResolvedValue(null);
  vi.spyOn(OllamaClient.prototype, "answer").mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("HTTP do assistente", () => {
  it("retorna 401 quando não recebe token", async () => {
    const response = await request(app)
      .post("/api/chat")
      .send({ message: "Qual serviço gasta mais energia?" });

    expect(response.status).toBe(401);
  });

  it("retorna 401 quando recebe token inválido", async () => {
    const response = await request(app)
      .post("/api/chat")
      .set("Authorization", "Bearer token-invalido")
      .send({ message: "Qual serviço gasta mais energia?" });

    expect(response.status).toBe(401);
  });

  it("retorna 400 quando a mensagem está vazia", async () => {
    const token = createToken({ sub: "1" });

    const response = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "   " });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_CHAT_MESSAGE");
    expect(
      IndicadoresRepository.prototype.findCollectionsForPeriod,
    ).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o corpo não traz uma mensagem textual", async () => {
    const token = createToken({ sub: "1" });

    const response = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: 42 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_CHAT_MESSAGE");
  });

  it("retorna 400 quando o período é inválido", async () => {
    const token = createToken({ sub: "1" });

    const response = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({
        message: "Qual serviço gasta mais energia?",
        period: "30d",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_CHAT_PERIOD");
    expect(
      IndicadoresRepository.prototype.findCollectionsForPeriod,
    ).not.toHaveBeenCalled();
  });

  it("retorna a resposta determinística quando não há dados no período", async () => {
    const token = createToken({ sub: "1" });

    const response = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({
        message: "Qual serviço gasta mais energia?",
        period: "24h",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: "Resposta do assistente",
      intent: "RANKING_ENERGY",
      chart: null,
      partial: true,
      model: "regras",
      degraded: false,
      period: {
        label: "24h",
      },
    });
    expect(response.body.answer).toContain("Não encontrei");

    expect(
      IndicadoresRepository.prototype.findCollectionsForPeriod,
    ).toHaveBeenCalledTimes(1);
  });
});

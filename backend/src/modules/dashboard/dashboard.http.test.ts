import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { createToken } from "../../shared/utils/jwt.util.js";
import { IndicadoresRepository } from "../indicadores/indicadores.repository.js";
import { DashboardRepository } from "./dashboard.repository.js";

// Prepara JWT de teste e as duas consultas simuladas antes de cada cenário HTTP.
beforeEach(() => {
  vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
  vi.stubEnv("JWT_EXPIRES_IN", "15m");

  // Define respostas conhecidas para as duas consultas.
  // Nenhuma delas acessará o PostgreSQL.
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
});

// Remove as substituições de métodos e restaura as variáveis ao terminar cada teste.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
// Testes HTTP de GET /api/dashboard, com JWT real e consultas simuladas.
describe("HTTP do dashboard", () => {
  // A autenticação deve bloquear a requisição antes de acionar qualquer consulta.
  it("retorna 401 quando não recebe token", async () => {
    const response = await request(app).get("/api/dashboard").query({
      start: "2026-11-01T00:00:00.000Z",
      end: "2026-11-02T00:00:00.000Z",
    });

    expect(response.status).toBe(401);

    expect(
      IndicadoresRepository.prototype.findCollectionsForPeriod,
    ).not.toHaveBeenCalled();

    expect(
      DashboardRepository.prototype.countServicesByAvailability,
    ).not.toHaveBeenCalled();
  });
  // Confirma resposta 200 com resumo zerado para token e período válidos,
  // quando as consultas simuladas não retornam serviços.
  it("retorna 200 com o resumo quando token e período são válidos", async () => {
    const token = createToken({ sub: "1" });

    const start = "2026-11-01T00:00:00.000Z";
    const end = "2026-11-02T00:00:00.000Z";

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .query({ start, end });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Dados consolidados do dashboard",
      period: {
        start,
        end,
      },
      summary: {
        energyKwh: 0,
        emissionsGco2e: 0,
        activeServiceCount: 0,
        noMetricsServiceCount: 0,
        unavailableServiceCount: 0,
        isPartial: false,
      },
    });

    expect(
      IndicadoresRepository.prototype.findCollectionsForPeriod,
    ).toHaveBeenCalledTimes(1);

    expect(
      DashboardRepository.prototype.countServicesByAvailability,
    ).toHaveBeenCalledExactlyOnceWith();
  });
  // Confirma que enviar apenas start retorna 400,
  // sem executar as consultas aos repositories.
  it("retorna 400 quando informa somente a data inicial", async () => {
    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "2026-11-01T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_DASHBOARD_PERIOD");

    expect(
      IndicadoresRepository.prototype.findCollectionsForPeriod,
    ).not.toHaveBeenCalled();

    expect(
      DashboardRepository.prototype.countServicesByAvailability,
    ).not.toHaveBeenCalled();
  });
  // Simula uma falha na consulta de disponibilidade e confirma
  // a resposta 500 com mensagem genérica, sem expor detalhes internos.
  it("retorna 500 quando uma consulta do dashboard falha", async () => {
    const token = createToken({ sub: "1" });

    // O método já foi simulado no beforeEach; vi.mocked permite configurar sua rejeição com tipagem.
    vi.mocked(
      DashboardRepository.prototype.countServicesByAvailability,
    ).mockRejectedValue(
      new Error("Falha simulada na consulta de disponibilidade"),
    );

    const response = await request(app)
      .get("/api/dashboard")
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

    expect(
      DashboardRepository.prototype.countServicesByAvailability,
    ).toHaveBeenCalledTimes(1);
  });
});

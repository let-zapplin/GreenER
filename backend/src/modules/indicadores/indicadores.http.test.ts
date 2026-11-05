import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { createToken } from "../../shared/utils/jwt.util.js";
import { IndicadoresRepository } from "./indicadores.repository.js";

// Desfaz spies e variáveis de teste; nenhuma alteração é gravada no arquivo .env.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
// Testes HTTP dos indicadores com autenticação real e consultas ao banco simuladas.
describe("HTTP dos indicadores", () => {
  // Datas válidas mantêm o cenário focado no bloqueio por falta de autenticação.
  it("retorna 401 ao consultar indicadores sem token", async () => {
    const response = await request(app).get("/api/indicadores").query({
      start: "2026-11-01T00:00:00.000Z",
      end: "2026-11-02T00:00:00.000Z",
    });

    expect(response.status).toBe(401);
  });
  // Sem start e end, a validação deve impedir a consulta, mesmo com JWT válido.
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
  // Envia ambas as datas, mas start contém um texto inválido; espera rejeição antes da consulta.
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

  // Datas válidas individualmente, mas invertidas, devem falhar antes da consulta.
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

  // Um período de duração zero é inválido para esta consulta.
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

  // A lista vira parâmetros repetidos; o controller exige uma única data por parâmetro.
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

  // Mesmo com período válido, um JWT malformado deve impedir a consulta ao repository.
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

  // A consulta simulada devolve nenhum serviço: verifica resumo parcial zerado e as datas encaminhadas.
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

  // Simula erro do repository e confere que a resposta não revela sua mensagem técnica.
  // O registro em console.error é esperado nesse cenário controlado.
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

  // Dados simulados alimentam o cálculo real: 50,95 W por 60 segundos e fator de carbono 200.
  // Confere energia e emissão no resumo e na amostra, com tolerância decimal.
  it("retorna energia e emissão calculadas para uma coleta válida", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarIndicadores = vi
      .spyOn(IndicadoresRepository.prototype, "findCollectionsForPeriod")
      .mockResolvedValue([
        {
          id_service: 1,
          name: "Serviço de teste",
          status: "active",
          region_code: "BR-SP",
          collections: [
            {
              id_collection: "10",
              status: "success",
              attempted_at: new Date("2026-11-01T12:00:00.000Z"),
              id_metrics: "20",
              recorded_at: new Date("2026-11-01T12:00:00.000Z"),
              cpu_percent: 50,
              memory_gb: 2,
              disk_gb: 10,
              network_gb: 5,
              collection_interval_seconds: 60,
              carbon_intensity_id: 30,
              carbon_intensity_gco2e_per_kwh: 200,
            },
          ],
        },
      ]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "2026-11-01T00:00:00.000Z",
        end: "2026-11-02T00:00:00.000Z",
      });

    expect(response.status).toBe(200);

    expect(response.body.summary).toMatchObject({
      serviceCount: 1,
      collectionCount: 1,
      validMetricCount: 1,
      validCarbonIntensityCount: 1,
      isPartial: false,
    });

    expect(response.body.summary.energyKwh).toBeCloseTo(0.000849166667, 10);

    expect(response.body.summary.emissionsGco2e).toBeCloseTo(
      0.169833333333,
      10,
    );

    expect(response.body.services).toHaveLength(1);

    const servico = response.body.services[0];

    expect(servico.serviceId).toBe(1);
    expect(servico.latestSampleInPeriod.energyKwh).toBeCloseTo(
      0.000849166667,
      10,
    );
    expect(servico.latestSampleInPeriod.emissionsGco2e).toBeCloseTo(
      0.169833333333,
      10,
    );

    expect(consultarIndicadores).toHaveBeenCalledTimes(1);
  });
});

// A rota de histórico calcula amostras por serviço com consulta simulada e JWT real.
describe("HTTP do histórico ambiental", () => {
  // Sem token, nem a consulta de histórico deve ser chamada.
  it("retorna 401 ao consultar histórico sem token", async () => {
    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const response = await request(app)
      .get("/api/indicadores/7/historico")
      .query({
        start: "2026-11-03T00:00:00.000Z",
        end: "2026-11-04T00:00:00.000Z",
      });

    expect(response.status).toBe(401);
    expect(consultarHistorico).not.toHaveBeenCalled();
  });

  it("retorna 400 quando não informa o período", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores/7/historico")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(
      "INVALID_INDICATOR_PERIOD",
    );

    expect(consultarHistorico).not.toHaveBeenCalled();
  });

  // O ID textual abc deve ser rejeitado antes da consulta, mesmo com token e datas válidos.
  it("retorna 400 quando o identificador do serviço é inválido", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores/abc/historico")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "2026-11-03T00:00:00.000Z",
        end: "2026-11-04T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_SERVICE_ID");

    expect(consultarHistorico).not.toHaveBeenCalled();
  });

  // Lista vazia do repository representa serviço não encontrado, não apenas falta de amostras.
  it("retorna 404 quando o serviço não existe", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores/999/historico")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "2026-11-03T00:00:00.000Z",
        end: "2026-11-04T00:00:00.000Z",
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: "Serviço não encontrado",
      code: "SERVICE_NOT_FOUND",
    });

    expect(consultarHistorico).toHaveBeenCalledTimes(1);
  });

  // Um serviço retornado com collections vazio existe e deve produzir samples vazio, sem 404.
  it("retorna 200 com lista vazia quando o serviço existe, mas não possui coletas no período", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([
        {
          id_service: 7,
          name: "Serviço de pedidos",
          status: "active",
          region_code: "BR-SP",
          collections: [],
        },
      ]);

    const token = createToken({ sub: "1" });

    const response = await request(app)
      .get("/api/indicadores/7/historico")
      .set("Authorization", `Bearer ${token}`)
      .query({
        start: "2026-11-03T00:00:00.000Z",
        end: "2026-11-04T00:00:00.000Z",
      });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      message: "Histórico de indicadores calculado",
      service: {
        serviceId: 7,
        name: "Serviço de pedidos",
        status: "active",
        regionCode: "BR-SP",
      },
      samples: [],
    });
  });

  // Confere identificação, datas serializadas, cálculo da amostra e filtro por ID enviado ao repository.
  it("retorna o histórico ambiental calculado de um serviço", async () => {
    vi.stubEnv("JWT_SECRET", "segredo-exclusivo-deste-teste");
    vi.stubEnv("JWT_EXPIRES_IN", "15m");

    const consultarHistorico = vi
      .spyOn(
        IndicadoresRepository.prototype,
        "findCollectionsForPeriod",
      )
      .mockResolvedValue([
        {
          id_service: 7,
          name: "Serviço de pedidos",
          status: "active",
          region_code: "BR-SP",
          collections: [
            {
              id_collection: "101",
              status: "success",
              attempted_at: new Date(
                "2026-11-03T12:00:00.000Z",
              ),
              id_metrics: "201",
              recorded_at: new Date(
                "2026-11-03T12:00:00.000Z",
              ),
              cpu_percent: 50,
              memory_gb: 2,
              disk_gb: 10,
              network_gb: 5,
              collection_interval_seconds: 60,
              carbon_intensity_id: 301,
              carbon_intensity_gco2e_per_kwh: 200,
            },
          ],
        },
      ]);

    const token = createToken({ sub: "1" });

    const start = "2026-11-03T00:00:00.000Z";
    const end = "2026-11-04T00:00:00.000Z";

    const response = await request(app)
      .get("/api/indicadores/7/historico")
      .set("Authorization", `Bearer ${token}`)
      .query({ start, end });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      message: "Histórico de indicadores calculado",

      period: {
        start,
        end,
      },

      service: {
        serviceId: 7,
        name: "Serviço de pedidos",
        status: "active",
        regionCode: "BR-SP",
      },
    });

    expect(response.body.samples).toHaveLength(1);

    expect(response.body.samples[0]).toMatchObject({
      collectionId: "101",
      attemptedAt: "2026-11-03T12:00:00.000Z",
      status: "success",
      gapReason: null,
    });

    expect(
      response.body.samples[0].energyKwh,
    ).toBeCloseTo(0.000849166667, 10);

    expect(
      response.body.samples[0].emissionsGco2e,
    ).toBeCloseTo(0.169833333333, 10);

    expect(consultarHistorico).toHaveBeenCalledTimes(1);

    const argumentos = consultarHistorico.mock.calls[0];

    expect(argumentos[0]).toEqual(new Date(start));
    expect(argumentos[1]).toEqual(new Date(end));

    // O quarto argumento restringe a consulta ao ID do serviço solicitado no histórico.
    expect(argumentos[3]).toBe(7);
  });
});

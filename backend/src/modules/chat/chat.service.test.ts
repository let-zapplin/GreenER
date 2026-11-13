import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatService } from "./chat.service.js";

vi.mock("../../config/env.js", () => ({
  env: {
    metricsCollectionIntervalMs: 60_000,
    carbonIntensityMaxAgeMs: 300_000,
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "modelo-teste",
    ollamaTimeoutMs: 1_000,
    ollamaEnabled: false,
  },
}));

vi.mock("../indicadores/indicadores.repository.js", () => ({
  IndicadoresRepository: class {},
}));

vi.mock("../dashboard/dashboard.repository.js", () => ({
  DashboardRepository: class {},
}));

const NOW = new Date("2026-11-10T12:00:00.000Z");

function createIndicatorService({
  serviceId = 1,
  name,
  status = "active",
  energyKwh = 0,
  emissionsGco2e = 0,
  collectionCount = 1,
  validMetricCount = 1,
  isPartial = false,
}: {
  serviceId?: number;
  name: string;
  status?: string;
  energyKwh?: number;
  emissionsGco2e?: number;
  collectionCount?: number;
  validMetricCount?: number;
  isPartial?: boolean;
}) {
  return {
    serviceId,
    name,
    status,
    regionCode: "BR",
    latestSampleInPeriod: null,
    periodTotals: {
      energyKwh,
      emissionsGco2e,
      collectionCount,
      validMetricCount,
      validCarbonIntensityCount: validMetricCount,
      metricCoveragePercent: 100,
      carbonIntensityCoveragePercent: 100,
      isPartial,
      gaps: [],
    },
  };
}

function createIndicatorsResult(services: ReturnType<typeof createIndicatorService>[]) {
  return {
    period: {
      start: new Date("2026-11-09T12:00:00.000Z"),
      end: NOW,
      collectionIntervalMs: 60_000,
    },
    powerModel: {
      version: "1",
      cpuMaximumWatts: 100,
      memoryWattsPerGb: 0.375,
      diskWattsPerGb: 0.01,
      networkWattsPerGb: 0.02,
    },
    summary: {
      serviceCount: services.length,
      activeServiceCount: services.filter(
        (service) => service.status === "active",
      ).length,
      energyKwh: services.reduce(
        (total, service) => total + service.periodTotals.energyKwh,
        0,
      ),
      emissionsGco2e: services.reduce(
        (total, service) => total + service.periodTotals.emissionsGco2e,
        0,
      ),
      collectionCount: 1,
      validMetricCount: 1,
      validCarbonIntensityCount: 1,
      metricCoveragePercent: 100,
      carbonIntensityCoveragePercent: 100,
      isPartial: services.some(
        (service) => service.periodTotals.isPartial,
      ),
    },
    services,
  };
}

describe("ChatService", () => {
  const getIndicators = vi.fn();
  const getServiceHistory = vi.fn();
  const getSummary = vi.fn();
  const classify = vi.fn();
  const answer = vi.fn();

  function createLlm(enabled = false) {
    classify.mockReset();
    answer.mockReset();
    classify.mockResolvedValue(null);
    answer.mockResolvedValue(null);

    return {
      enabled,
      model: "modelo-teste",
      classify,
      answer,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("monta ranking de energia ordenado e usa regras quando o Ollama está desligado", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", energyKwh: 0.2 }),
        createIndicatorService({ serviceId: 2, name: "Beta", energyKwh: 0.8 }),
        createIndicatorService({
          serviceId: 3,
          name: "Removido",
          status: "removed",
          energyKwh: 10,
        }),
      ]),
    );

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => NOW,
    );

    const result = await service.chat("Qual serviço gasta mais energia?");

    expect(getIndicators).toHaveBeenCalledWith(
      "2026-11-09T12:00:00.000Z",
      "2026-11-10T12:00:00.000Z",
    );
    expect(result.intent).toBe("RANKING_ENERGY");
    expect(result.answer).toContain("Beta");
    expect(result.answer).toContain("0,8");
    expect(result.answer).not.toContain("Removido");
    expect(result.chart).toEqual({
      type: "bar",
      title: "Consumo de energia por serviço",
      unit: "kWh",
      data: [
        { label: "Beta", value: 0.8 },
        { label: "Alpha", value: 0.2 },
      ],
    });
    expect(result.model).toBe("regras");
    expect(result.degraded).toBe(true);
    expect(result.period.label).toBe("24h");
    expect(result.partial).toBe(false);
    expect(answer).not.toHaveBeenCalled();
  });

  it("monta ranking crescente quando a pergunta pede o menor consumo", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", energyKwh: 0.2 }),
        createIndicatorService({ serviceId: 2, name: "Beta", energyKwh: 0.8 }),
      ]),
    );

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => NOW,
    );

    const result = await service.chat("Qual serviço gasta menos energia?");

    expect(result.intent).toBe("RANKING_ENERGY");
    expect(result.answer).toContain("consumiu menos energia");
    expect(result.answer.indexOf("Alpha")).toBeLessThan(
      result.answer.indexOf("Beta"),
    );
    expect(result.chart).toEqual({
      type: "bar",
      title: "Menor consumo de energia por serviço",
      unit: "kWh",
      data: [
        { label: "Alpha", value: 0.2 },
        { label: "Beta", value: 0.8 },
      ],
    });
    expect(result.model).toBe("regras");
    expect(answer).not.toHaveBeenCalled();
  });

  it("não chama o modelo quando as regras decidem uma resposta de dados", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", energyKwh: 0.2 }),
        createIndicatorService({
          serviceId: 2,
          name: "Beta",
          energyKwh: 0.8,
        }),
      ]),
    );

    const llm = createLlm(true);

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
    );

    const result = await service.chat("Qual serviço gasta mais energia?");

    expect(classify).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
    expect(result.intent).toBe("RANKING_ENERGY");
    expect(result.answer).toContain("Beta");
    expect(result.model).toBe("regras");
    expect(result.degraded).toBe(false);
  });

  it("consulta o classificador quando as regras não decidem", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", emissionsGco2e: 50 }),
        createIndicatorService({
          serviceId: 2,
          name: "Beta",
          emissionsGco2e: 120,
        }),
      ]),
    );

    const llm = createLlm(true);

    classify.mockResolvedValue({
      intent: "RANKING_EMISSIONS",
      serviceName: null,
    });

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
    );

    const result = await service.chat("Qual está pior?");

    expect(classify).toHaveBeenCalledWith("Qual está pior?", [
      "Alpha",
      "Beta",
    ]);
    expect(answer).not.toHaveBeenCalled();
    expect(result.intent).toBe("RANKING_EMISSIONS");
    expect(result.answer).toContain("Beta");
    expect(result.chart).toMatchObject({
      type: "bar",
      unit: "gCO₂e",
      data: [
        { label: "Beta", value: 120 },
        { label: "Alpha", value: 50 },
      ],
    });
    expect(result.model).toBe("regras");
    expect(result.degraded).toBe(false);
  });

  it("detalha um serviço com histórico e gráfico de linha", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({
          serviceId: 7,
          name: "Serviço Solar",
          energyKwh: 0.5,
          emissionsGco2e: 100,
          collectionCount: 3,
          validMetricCount: 3,
        }),
      ]),
    );

    getServiceHistory.mockResolvedValue({
      period: {
        start: new Date("2026-11-10T11:00:00.000Z"),
        end: NOW,
        collectionIntervalMs: 60_000,
        displayIntervalMs: 60_000,
      },
      service: {
        serviceId: 7,
        name: "Serviço Solar",
        status: "active",
        regionCode: "BR",
      },
      samples: [
        {
          collectionId: "1",
          attemptedAt: new Date("2026-11-10T11:10:00.000Z"),
          status: "success",
          metrics: null,
          collectionIntervalSeconds: 60,
          energyKwh: 0.1,
          emissionsGco2e: 20,
          carbonIntensityGco2ePerKwh: 200,
          gapReason: null,
        },
        {
          collectionId: "2",
          attemptedAt: new Date("2026-11-10T11:20:00.000Z"),
          status: "unavailable",
          metrics: null,
          collectionIntervalSeconds: 60,
          energyKwh: null,
          emissionsGco2e: null,
          carbonIntensityGco2ePerKwh: null,
          gapReason: "unavailable",
        },
        {
          collectionId: "3",
          attemptedAt: new Date("2026-11-10T11:30:00.000Z"),
          status: "success",
          metrics: null,
          collectionIntervalSeconds: 60,
          energyKwh: 0.2,
          emissionsGco2e: 40,
          carbonIntensityGco2ePerKwh: 200,
          gapReason: null,
        },
      ],
    });

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => NOW,
    );

    const result = await service.chat("Como está o serviço Serviço Solar?", "1h");

    expect(getServiceHistory).toHaveBeenCalledWith(
      7,
      "2026-11-10T11:00:00.000Z",
      "2026-11-10T12:00:00.000Z",
    );
    expect(result.intent).toBe("SERVICE_SUMMARY");
    expect(result.chart).toMatchObject({
      type: "line",
      title: "Consumo de energia — Serviço Solar",
      unit: "kWh",
    });
    expect(result.chart?.data.map((point) => point.value)).toEqual([
      0.1,
      null,
      0.2,
    ]);
    expect(result.answer).toContain("Serviço Solar");
    expect(result.answer).toContain("0,5");
    expect(result.degraded).toBe(true);
  });

  it("consolida o panorama ambiental pelo dashboard", async () => {
    getSummary.mockResolvedValue({
      period: {
        start: new Date("2026-11-10T06:00:00.000Z"),
        end: NOW,
      },
      summary: {
        energyKwh: 2.5,
        emissionsGco2e: 400,
        activeServiceCount: 4,
        noMetricsServiceCount: 1,
        unavailableServiceCount: 1,
        isPartial: true,
      },
    });

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => NOW,
    );

    const result = await service.chat("Panorama ambiental", "6h");

    expect(getSummary).toHaveBeenCalledWith(
      "2026-11-10T06:00:00.000Z",
      "2026-11-10T12:00:00.000Z",
    );
    expect(result.intent).toBe("ENVIRONMENT_SUMMARY");
    expect(result.chart).toEqual({
      type: "bar",
      title: "Disponibilidade dos serviços ativos",
      unit: "serviços",
      data: [
        { label: "Com métricas", value: 4 },
        { label: "Sem métricas", value: 1 },
        { label: "Indisponíveis", value: 1 },
      ],
    });
    expect(result.answer).toContain("2,5");
    expect(result.answer).toContain("parcial");
    expect(result.partial).toBe(true);
  });

  it("recusa perguntas fora do escopo sem chamar ferramentas de dados", async () => {
    getIndicators.mockResolvedValue(createIndicatorsResult([]));

    const llm = createLlm(true);

    classify.mockResolvedValue({
      intent: "OUT_OF_SCOPE",
      serviceName: null,
    });

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
    );

    const result = await service.chat("Qual é a previsão do tempo?");

    expect(result.intent).toBe("OUT_OF_SCOPE");
    expect(result.chart).toBeNull();
    expect(result.answer).toContain("Consigo responder apenas");
    expect(getServiceHistory).not.toHaveBeenCalled();
    expect(getSummary).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
  });

  it("informa quando não há dados de ranking no período", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", energyKwh: 0 }),
      ]),
    );

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => NOW,
    );

    const result = await service.chat("Qual serviço gasta mais energia?");

    expect(result.chart).toBeNull();
    expect(result.answer).toContain("Não encontrei");
  });

  it("lista os serviços disponíveis quando o nome não é encontrado", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha" }),
        createIndicatorService({ serviceId: 2, name: "Beta" }),
      ]),
    );

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => NOW,
    );

    const result = await service.chat("Como está o serviço Inexistente?");

    expect(result.intent).toBe("SERVICE_SUMMARY");
    expect(result.chart).toBeNull();
    expect(result.answer).toContain("Alpha, Beta");
    expect(getServiceHistory).not.toHaveBeenCalled();
  });

  it("reutiliza a resposta em cache para a mesma pergunta", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", energyKwh: 2 }),
      ]),
    );

    const llm = createLlm(true);
    answer.mockResolvedValue("Resposta cacheada.");

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
    );

    const first = await service.chat("O que é o GreenER?");
    const second = await service.chat("O que é o GreenER?");

    expect(answer).toHaveBeenCalledTimes(1);
    expect(getIndicators).toHaveBeenCalledTimes(1);
    expect(first.answer).toBe("Resposta cacheada.");
    expect(second.answer).toBe("Resposta cacheada.");
    expect(second.conversationId).not.toBe(first.conversationId);
  });

  it("compartilha uma única execução entre chamadas simultâneas", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", energyKwh: 2 }),
      ]),
    );

    const llm = createLlm(true);
    let resolveAnswer: (value: string) => void = () => {};
    answer.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveAnswer = resolve;
      }),
    );

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
    );

    const first = service.chat("O que é o GreenER?");
    const second = service.chat("O que é o GreenER?");

    resolveAnswer("Resposta única.");

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(answer).toHaveBeenCalledTimes(1);
    expect(firstResult.answer).toBe("Resposta única.");
    expect(secondResult.answer).toBe("Resposta única.");
  });

  it("expira o cache de respostas de dados após o intervalo de coleta", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", energyKwh: 2 }),
      ]),
    );

    let current = NOW;
    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => current,
    );

    await service.chat("Qual serviço gasta mais energia?");
    current = new Date(NOW.getTime() + 61_000);
    await service.chat("Qual serviço gasta mais energia?");

    expect(getIndicators).toHaveBeenCalledTimes(2);
  });

  it("reaproveita os indicadores entre perguntas diferentes do mesmo período", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({
          name: "Alpha",
          energyKwh: 2,
          emissionsGco2e: 300,
        }),
      ]),
    );

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => NOW,
    );

    await service.chat("Qual serviço gasta mais energia?");
    await service.chat("Qual serviço emite mais CO₂?");

    expect(getIndicators).toHaveBeenCalledTimes(1);
  });

  it("reaproveita a classificação de continuações repetidas", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({
          serviceId: 1,
          name: "Alpha",
          energyKwh: 2,
          emissionsGco2e: 400,
        }),
      ]),
    );
    getServiceHistory.mockResolvedValue({ samples: [] });

    const llm = createLlm(true);
    classify.mockResolvedValue({
      intent: "SERVICE_SUMMARY",
      serviceName: "Alpha",
    });

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
    );

    const first = await service.chat("E as emissões?");
    const second = await service.chat("E as emissões?");

    expect(classify).toHaveBeenCalledTimes(1);
    expect(answer).not.toHaveBeenCalled();
    expect(first.intent).toBe("SERVICE_SUMMARY");
    expect(second.answer).toContain("Alpha");
  });

  it("rejeita mensagem vazia, mensagem longa e período inválido antes de consultar dados", async () => {
    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(false),
      () => NOW,
    );

    await expect(service.chat("   ")).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CHAT_MESSAGE",
    });

    await expect(service.chat("a".repeat(501))).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CHAT_MESSAGE",
    });

    await expect(
      service.chat("Qual serviço gasta mais energia?", "30d"),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CHAT_PERIOD",
    });

    expect(getIndicators).not.toHaveBeenCalled();
  });
});

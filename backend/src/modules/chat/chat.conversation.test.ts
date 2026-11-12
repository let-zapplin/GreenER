import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatService } from "./chat.service.js";
import { InMemoryChatStateStore } from "./chat.state.js";

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

type TestService = ReturnType<typeof createIndicatorService>;

function createIndicatorsResult(services: TestService[]) {
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
      isPartial: services.some((service) => service.periodTotals.isPartial),
    },
    services,
  };
}

function emptyHistory() {
  return { samples: [] };
}

describe("ChatService — memória e contexto", () => {
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

    return { enabled, model: "modelo-teste", classify, answer };
  }

  function createService(enabledLlm = false) {
    return new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(enabledLlm),
      () => NOW,
      new InMemoryChatStateStore(),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getServiceHistory.mockResolvedValue(emptyHistory());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gera um conversationId e o mantém entre chamadas", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ name: "Alpha", energyKwh: 0.5 }),
      ]),
    );

    const service = createService();

    const first = await service.chat("Qual serviço gasta mais energia?");
    const second = await service.chat("Qual serviço gasta mais energia?", "24h", {
      conversationId: first.conversationId,
    });

    expect(first.conversationId).toMatch(/^[A-Za-z0-9_-]{8,}$/);
    expect(second.conversationId).toBe(first.conversationId);
  });

  it("pede clarificação quando o nome casa com mais de um serviço", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ serviceId: 1, name: "Solar Norte" }),
        createIndicatorService({ serviceId: 2, name: "Solar Sul" }),
      ]),
    );

    const service = createService();

    const result = await service.chat("Como está o serviço Solar?");

    expect(result.intent).toBe("SERVICE_SUMMARY");
    expect(result.answer).toContain("mais de um serviço");
    expect(result.chart).toBeNull();
    expect(result.suggestions).toEqual([]);
    expect(result.clarification).not.toBeNull();
    expect(result.clarification?.options.map((option) => option.label)).toEqual([
      "Solar Norte",
      "Solar Sul",
    ]);
    expect(getServiceHistory).not.toHaveBeenCalled();
  });

  it("resolve a clarificação pendente pelo ordinal", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ serviceId: 1, name: "Solar Norte" }),
        createIndicatorService({ serviceId: 2, name: "Solar Sul" }),
      ]),
    );

    const service = createService();
    const conversationId = "conversa-clarificacao";

    const question = await service.chat("Como está o serviço Solar?", "24h", {
      conversationId,
    });

    expect(question.clarification).not.toBeNull();

    const result = await service.chat("o segundo", "24h", { conversationId });

    expect(result.intent).toBe("SERVICE_SUMMARY");
    expect(result.clarification).toBeNull();
    expect(result.answer).toContain("Solar Sul");
    expect(getServiceHistory).toHaveBeenCalledWith(
      2,
      "2026-11-09T12:00:00.000Z",
      "2026-11-10T12:00:00.000Z",
    );
  });

  it("mantém o serviço ativo e entende 'e as emissões dele?'", async () => {
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

    const service = createService();
    const conversationId = "conversa-follow-up";

    await service.chat("Como está o serviço Alpha?", "24h", { conversationId });
    const result = await service.chat("E as emissões dele?", "24h", {
      conversationId,
    });

    expect(result.intent).toBe("SERVICE_SUMMARY");
    expect(result.answer).toContain("Alpha");
    expect(result.answer).toContain("400");
    expect(getServiceHistory).toHaveBeenCalledTimes(2);
    expect(getServiceHistory).toHaveBeenLastCalledWith(
      1,
      "2026-11-09T12:00:00.000Z",
      "2026-11-10T12:00:00.000Z",
    );
  });

  it("usa o serviço informado pelo contexto da página", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ serviceId: 1, name: "Alpha" }),
        createIndicatorService({ serviceId: 2, name: "Beta" }),
      ]),
    );

    const service = createService();

    const result = await service.chat("Como está esse serviço?", "24h", {
      context: { page: "/monitoring", serviceName: "Beta" },
    });

    expect(result.intent).toBe("SERVICE_SUMMARY");
    expect(result.answer).toContain("Beta");
    expect(getServiceHistory).toHaveBeenCalledWith(
      2,
      "2026-11-09T12:00:00.000Z",
      "2026-11-10T12:00:00.000Z",
    );
  });

  it("pede clarificação quando a pergunta de serviço não cita um nome", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ serviceId: 1, name: "Alpha" }),
        createIndicatorService({ serviceId: 2, name: "Beta" }),
      ]),
    );

    const service = createService();

    const result = await service.chat("Quero ver o histórico");

    expect(result.intent).toBe("SERVICE_SUMMARY");
    expect(result.clarification?.options.map((option) => option.label)).toEqual(
      ["Alpha", "Beta"],
    );
    expect(getServiceHistory).not.toHaveBeenCalled();
  });

  it("detecta o período citado na mensagem", async () => {
    getIndicators.mockResolvedValue(createIndicatorsResult([]));
    getSummary.mockResolvedValue({
      period: {
        start: new Date("2026-11-03T12:00:00.000Z"),
        end: NOW,
      },
      summary: {
        energyKwh: 1,
        emissionsGco2e: 100,
        activeServiceCount: 0,
        noMetricsServiceCount: 0,
        unavailableServiceCount: 0,
        isPartial: false,
      },
    });

    const service = createService();

    const result = await service.chat("Panorama ambiental da última semana", "24h");

    expect(result.intent).toBe("ENVIRONMENT_SUMMARY");
    expect(result.period.label).toBe("7d");
    expect(getSummary).toHaveBeenCalledWith(
      "2026-11-03T12:00:00.000Z",
      "2026-11-10T12:00:00.000Z",
    );
  });

  it("sugere próximos passos coerentes com o ranking", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ serviceId: 1, name: "Alpha", energyKwh: 2 }),
        createIndicatorService({ serviceId: 2, name: "Beta", energyKwh: 5 }),
      ]),
    );

    const service = createService();

    const result = await service.chat("Qual serviço gasta mais energia?");

    expect(result.suggestions.map((suggestion) => suggestion.label)).toEqual([
      "Ver emissões",
      "Detalhar Beta",
      "Ver últimos 7 dias",
    ]);
    expect(result.suggestions[2]?.period).toBe("7d");
  });

  it("resolve o serviço pelo identificador citado", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ serviceId: 1, name: "Alpha" }),
        createIndicatorService({ serviceId: 2, name: "Beta" }),
      ]),
    );

    const service = createService();

    const result = await service.chat("Como está o serviço 2?");

    expect(result.intent).toBe("SERVICE_SUMMARY");
    expect(result.answer).toContain("Beta");
  });

  it("valida conversationId, contexto e histórico antes de consultar dados", async () => {
    const service = createService();

    await expect(
      service.chat("Qual serviço gasta mais energia?", "24h", {
        conversationId: "id inválido!",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CHAT_CONVERSATION",
    });

    await expect(
      service.chat("Qual serviço gasta mais energia?", "24h", {
        context: [],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CHAT_CONTEXT",
    });

    await expect(
      service.chat("Qual serviço gasta mais energia?", "24h", {
        history: "não é lista",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CHAT_HISTORY",
    });

    await expect(
      service.chat("Qual serviço gasta mais energia?", "24h", {
        history: [{ role: "system", content: "instrução" }],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CHAT_HISTORY",
    });

    expect(getIndicators).not.toHaveBeenCalled();
  });

  it("encaminha o histórico ao modelo e remove a mensagem atual duplicada", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ serviceId: 1, name: "Alpha" }),
        createIndicatorService({ serviceId: 2, name: "Beta" }),
      ]),
    );

    const llm = createLlm(true);
    classify.mockResolvedValue({
      intent: "SERVICE_SUMMARY",
      serviceName: "Alpha",
    });
    answer.mockResolvedValue("O serviço Alpha emitiu 400 gCO₂e.");

    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
      new InMemoryChatStateStore(),
    );
    const history = [
      { role: "user" as const, content: "Como está o serviço Alpha?" },
      { role: "assistant" as const, content: "Alpha consumiu 2 kWh." },
      { role: "user" as const, content: "E as emissões?" },
    ];

    const result = await service.chat("E as emissões?", "24h", { history });

    expect(classify).toHaveBeenCalledWith("E as emissões?", ["Alpha", "Beta"], [
      { role: "user", content: "Como está o serviço Alpha?" },
      { role: "assistant", content: "Alpha consumiu 2 kWh." },
    ]);
    expect(answer).toHaveBeenCalledWith(
      "E as emissões?",
      expect.anything(),
      [
        { role: "user", content: "Como está o serviço Alpha?" },
        { role: "assistant", content: "Alpha consumiu 2 kWh." },
      ],
    );
    expect(result.answer).toBe("O serviço Alpha emitiu 400 gCO₂e.");
    expect(result.model).toBe("modelo-teste");
    expect(llm.enabled).toBe(true);
  });

  it("não deixa o classificador escolher um serviço que a mensagem não resolve", async () => {
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({ serviceId: 1, name: "Solar Norte" }),
        createIndicatorService({ serviceId: 2, name: "Solar Sul" }),
      ]),
    );

    const llm = createLlm(true);
    classify.mockResolvedValue({
      intent: "SERVICE_SUMMARY",
      serviceName: "Solar Sul",
    });

    const service = createService(true);

    const result = await service.chat("Como está o serviço Solar?");

    expect(result.clarification?.options).toHaveLength(2);
    expect(getServiceHistory).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
    expect(llm.enabled).toBe(true);
  });
});

describe("ChatService — conhecimento do projeto", () => {
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

    return { enabled, model: "modelo-teste", classify, answer };
  }

  function createService(enabledLlm = false) {
    return new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      createLlm(enabledLlm),
      () => NOW,
      new InMemoryChatStateStore(),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getIndicators.mockResolvedValue(
      createIndicatorsResult([
        createIndicatorService({
          serviceId: 1,
          name: "Alpha",
          energyKwh: 2,
          emissionsGco2e: 300,
        }),
      ]),
    );
    getServiceHistory.mockResolvedValue(emptyHistory());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("responde sobre o projeto pelas regras quando o modelo está indisponível", async () => {
    const service = createService();

    const result = await service.chat("O que é o GreenER?");

    expect(result.intent).toBe("PROJECT_INFO");
    expect(result.model).toBe("regras");
    expect(result.degraded).toBe(true);
    expect(result.answer).toContain("estimativas ambientais");
    expect(result.chart).toBeNull();
    expect(answer).not.toHaveBeenCalled();
  });

  it("usa a base de conhecimento como fatos do modelo", async () => {
    const llm = createLlm(true);
    classify.mockResolvedValue({ intent: "METHODOLOGY", serviceName: null });
    answer.mockResolvedValue(
      "A emissão é a energia em kWh vezes a intensidade regional.",
    );
    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
      new InMemoryChatStateStore(),
    );

    const result = await service.chat("Como o CO₂e é calculado?");

    expect(result.intent).toBe("METHODOLOGY");
    expect(result.model).toBe("modelo-teste");
    expect(result.degraded).toBe(false);
    expect(result.answer).toBe(
      "A emissão é a energia em kWh vezes a intensidade regional.",
    );

    const context = answer.mock.calls[0]?.[1] as {
      facts: {
        knowledge: { content: string };
        powerModel: { cpuMaximumWatts: number };
      };
    };

    expect(context.facts.knowledge.content).toContain("CO₂e_g");
    expect(context.facts.powerModel.cpuMaximumWatts).toBe(100);
  });

  it("não deixa uma explicação capturar uma pergunta de dados", async () => {
    const llm = createLlm(true);
    classify.mockResolvedValue({ intent: "METHODOLOGY", serviceName: null });
    answer.mockResolvedValue("Alpha consumiu mais energia.");
    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
      new InMemoryChatStateStore(),
    );

    const result = await service.chat("Qual serviço gasta mais energia?");

    expect(result.intent).toBe("RANKING_ENERGY");
    expect(result.chart).not.toBeNull();
  });

  it("mantém a continuidade em follow-up de conhecimento", async () => {
    const llm = createLlm(true);
    classify
      .mockResolvedValueOnce({ intent: "METHODOLOGY", serviceName: null })
      .mockResolvedValue({ intent: "OUT_OF_SCOPE", serviceName: null });
    answer.mockResolvedValue("Explicação didática.");
    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
      new InMemoryChatStateStore(),
    );

    const first = await service.chat("Como o CO₂e é calculado?");
    const second = await service.chat("E a energia?", "24h", {
      conversationId: first.conversationId,
    });

    expect(second.intent).toBe("METHODOLOGY");

    const context = answer.mock.calls[1]?.[1] as {
      facts: { knowledge: { title: string } };
    };

    expect(context.facts.knowledge.title).toBe("Como a energia é calculada");
  });

  it("preserva o serviço ativo ao responder sobre o projeto", async () => {
    const llm = createLlm(true);
    classify
      .mockResolvedValueOnce({
        intent: "SERVICE_SUMMARY",
        serviceName: "Alpha",
      })
      .mockResolvedValueOnce({ intent: "PROJECT_INFO", serviceName: null })
      .mockResolvedValue({ intent: "OUT_OF_SCOPE", serviceName: null });
    answer.mockResolvedValue("Resposta do assistente.");
    const service = new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      llm,
      () => NOW,
      new InMemoryChatStateStore(),
    );

    const first = await service.chat("Como está o serviço Alpha?");
    await service.chat("O que é o GreenER?", "24h", {
      conversationId: first.conversationId,
    });
    const third = await service.chat("E as emissões dele?", "24h", {
      conversationId: first.conversationId,
    });

    expect(third.intent).toBe("SERVICE_SUMMARY");

    const context = answer.mock.calls[2]?.[1] as {
      facts: { service: { name: string } };
    };

    expect(context.facts.service.name).toBe("Alpha");
  });
});

describe("Avaliação determinística do assistente", () => {
  const getIndicators = vi.fn();
  const getServiceHistory = vi.fn();
  const getSummary = vi.fn();

  const indicators = createIndicatorsResult([
    createIndicatorService({
      serviceId: 1,
      name: "Alpha",
      energyKwh: 2,
      emissionsGco2e: 300,
    }),
    createIndicatorService({
      serviceId: 2,
      name: "Beta",
      energyKwh: 5,
      emissionsGco2e: 100,
    }),
    createIndicatorService({
      serviceId: 3,
      name: "Solar Norte",
      energyKwh: 1,
      emissionsGco2e: 50,
    }),
    createIndicatorService({
      serviceId: 4,
      name: "Solar Sul",
      energyKwh: 0.5,
      emissionsGco2e: 25,
    }),
  ]);

  beforeEach(() => {
    vi.clearAllMocks();

    getIndicators.mockResolvedValue(indicators);
    getServiceHistory.mockResolvedValue(emptyHistory());
    getSummary.mockResolvedValue({
      period: {
        start: new Date("2026-11-09T12:00:00.000Z"),
        end: NOW,
      },
      summary: {
        energyKwh: 8.5,
        emissionsGco2e: 475,
        activeServiceCount: 4,
        noMetricsServiceCount: 0,
        unavailableServiceCount: 0,
        isPartial: false,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createService() {
    return new ChatService(
      { getIndicators, getServiceHistory },
      { getSummary },
      {
        enabled: false,
        model: "regras",
        classify: vi.fn().mockResolvedValue(null),
        answer: vi.fn().mockResolvedValue(null),
      },
      () => NOW,
      new InMemoryChatStateStore(),
    );
  }

  const cases: Array<{
    question: string;
    intent: string;
    period?: string;
    expectClarification?: boolean;
    answerContains?: string;
  }> = [
    { question: "Qual serviço gasta mais energia?", intent: "RANKING_ENERGY" },
    {
      question: "Qual serviço consome mais energia nos últimos 7 dias?",
      intent: "RANKING_ENERGY",
      period: "7d",
    },
    {
      question: "Quem está gastando mais energia hoje?",
      intent: "RANKING_ENERGY",
    },
    { question: "Qual serviço emite mais CO₂?", intent: "RANKING_EMISSIONS" },
    {
      question: "Ranking de emissões do ambiente",
      intent: "RANKING_EMISSIONS",
    },
    {
      question: "Qual tem a maior pegada de carbono?",
      intent: "RANKING_EMISSIONS",
    },
    {
      question: "Top 3 serviços por consumo de energia",
      intent: "RANKING_ENERGY",
    },
    { question: "Como está o serviço Alpha?", intent: "SERVICE_SUMMARY" },
    {
      question: "Resumo do serviço Beta nas últimas 6 horas",
      intent: "SERVICE_SUMMARY",
      period: "6h",
    },
    { question: "Me mostra o histórico do Alpha", intent: "SERVICE_SUMMARY" },
    {
      question: "Detalhes do serviço Solar Norte",
      intent: "SERVICE_SUMMARY",
    },
    {
      question: "O que aconteceu com o serviço Alpha na última hora?",
      intent: "SERVICE_SUMMARY",
      period: "1h",
    },
    {
      question: "Quanto o serviço Beta emitiu?",
      intent: "SERVICE_SUMMARY",
    },
    { question: "Panorama ambiental", intent: "ENVIRONMENT_SUMMARY" },
    {
      question: "Resumo ambiental dos últimos 7 dias",
      intent: "ENVIRONMENT_SUMMARY",
      period: "7d",
    },
    {
      question: "Como está a disponibilidade dos serviços?",
      intent: "ENVIRONMENT_SUMMARY",
    },
    { question: "Visão geral do ambiente", intent: "ENVIRONMENT_SUMMARY" },
    { question: "Qual o consumo total do ambiente?", intent: "ENVIRONMENT_SUMMARY" },
    { question: "O que é o GreenER?", intent: "PROJECT_INFO" },
    { question: "Quem fez o GreenER?", intent: "PROJECT_INFO" },
    { question: "Quais são as funcionalidades?", intent: "PROJECT_INFO" },
    { question: "Como a energia é calculada?", intent: "METHODOLOGY" },
    { question: "Como o CO₂e é calculado?", intent: "METHODOLOGY" },
    { question: "Qual é a previsão do tempo?", intent: "OUT_OF_SCOPE" },
    { question: "Quem ganhou o jogo ontem?", intent: "OUT_OF_SCOPE" },
    { question: "Escreva um poema sobre nuvens", intent: "OUT_OF_SCOPE" },
    { question: "e as emissões?", intent: "OUT_OF_SCOPE" },
    {
      question: "Como está o serviço Inexistente?",
      intent: "SERVICE_SUMMARY",
      answerContains: "Não encontrei",
    },
    {
      question: "Serviço Solar",
      intent: "SERVICE_SUMMARY",
      expectClarification: true,
    },
  ];

  it.each(cases)(
    "responde '$question' com intenção $intent",
    async ({ question, intent, period, expectClarification, answerContains }) => {
      const result = await createService().chat(question);

      expect(result.intent).toBe(intent);
      expect(result.period.label).toBe(period ?? "24h");
      expect(result.suggestions.length).toBeLessThanOrEqual(3);

      if (expectClarification) {
        expect(result.clarification).not.toBeNull();
      } else {
        expect(result.clarification).toBeNull();
      }

      if (answerContains !== undefined) {
        expect(result.answer).toContain(answerContains);
      }
    },
  );
});

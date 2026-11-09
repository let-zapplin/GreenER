import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardService } from "./dashboard.service.js";

// Testa as regras do dashboard com indicadores e contagens simulados, sem acessar PostgreSQL.
// Os intervalos ficam fixos para não depender do ambiente de desenvolvimento.
vi.mock("../../config/env.js", () => ({
  env: {
    metricsCollectionIntervalMs: 60_000,
    carbonIntensityMaxAgeMs: 300_000,
  },
}));

// Evita carregar a conexão real do módulo de indicadores; as dependências são injetadas no service.
vi.mock("../indicadores/indicadores.repository.js", () => ({
  IndicadoresRepository: class {},
}));

afterEach(() => {
  vi.useRealTimers();
});

// Monta somente os campos de um serviço calculado que o dashboard usa para agregar totais.
function createIndicatorService(
  status: string,
  energyKwh: number,
  emissionsGco2e: number,
  collectionCount: number,
  isPartial: boolean,
) {
  return {
    status,
    periodTotals: {
      energyKwh,
      emissionsGco2e,
      collectionCount,
      isPartial,
    },
  };
}

describe("DashboardService.getSummary", () => {
  const getIndicators = vi.fn();
  const countServicesByAvailability = vi.fn();
  const service = new DashboardService(
    { getIndicators } as never,
    { countServicesByAvailability } as never,
  );

  beforeEach(() => {
    // Limpa as chamadas para conferir o encaminhamento dos parâmetros em cada cenário.
    vi.clearAllMocks();
  });

  // Fixa o horário atual: sem datas informadas, espera as 24 horas anteriores.
  // Os valores do serviço removed não devem contribuir para energia ou emissão.
  it("usa as últimas 24 horas e soma somente os serviços ativos do catálogo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T12:00:00.000Z"));
    getIndicators.mockResolvedValue({
      services: [
        createIndicatorService("active", 0.25, 50, 2, false),
        createIndicatorService("active", 0.5, 100, 1, false),
        createIndicatorService("removed", 10, 2_000, 3, false),
      ],
    });
    countServicesByAvailability.mockResolvedValue({
      activeServiceCount: 2,
      noMetricsServiceCount: 1,
      unavailableServiceCount: 1,
    });

    const result = await service.getSummary();

    expect(result.period).toEqual({
      start: new Date("2026-10-30T12:00:00.000Z"),
      end: new Date("2026-10-31T12:00:00.000Z"),
    });
    expect(getIndicators).toHaveBeenCalledWith(
      "2026-10-30T12:00:00.000Z",
      "2026-10-31T12:00:00.000Z",
    );
    expect(result.summary).toEqual({
      energyKwh: 0.75,
      emissionsGco2e: 150,
      activeServiceCount: 2,
      noMetricsServiceCount: 1,
      unavailableServiceCount: 1,
      isPartial: false,
    });
  });

  // Um serviço ativo sem tentativas torna o resumo parcial, mesmo com totais zerados.
  it("marca o resumo parcial se serviço ativo não teve coleta no período", async () => {
    getIndicators.mockResolvedValue({
      services: [createIndicatorService("active", 0, 0, 0, true)],
    });
    countServicesByAvailability.mockResolvedValue({
      activeServiceCount: 1,
      noMetricsServiceCount: 0,
      unavailableServiceCount: 0,
    });

    const result = await service.getSummary(
      "2026-10-30T00:00:00.000Z",
      "2026-10-31T00:00:00.000Z",
    );

    expect(result.summary.isPartial).toBe(true);
    expect(getIndicators).toHaveBeenCalledWith(
      "2026-10-30T00:00:00.000Z",
      "2026-10-31T00:00:00.000Z",
    );
  });

  // Um serviço removido não torna o resumo parcial: ele fica fora da agregação.
  it("retorna totais vazios completos quando não há serviços ativos", async () => {
    getIndicators.mockResolvedValue({
      services: [createIndicatorService("removed", 0, 0, 0, true)],
    });
    countServicesByAvailability.mockResolvedValue({
      activeServiceCount: 0,
      noMetricsServiceCount: 0,
      unavailableServiceCount: 0,
    });

    const result = await service.getSummary(
      "2026-10-30T00:00:00.000Z",
      "2026-10-31T00:00:00.000Z",
    );

    expect(result.summary).toEqual({
      energyKwh: 0,
      emissionsGco2e: 0,
      activeServiceCount: 0,
      noMetricsServiceCount: 0,
      unavailableServiceCount: 0,
      isPartial: false,
    });
  });

  // Preserva a energia disponível, mas mantém a sinalização de dados incompletos.
  it("marca o resumo parcial quando cálculos do período têm lacunas", async () => {
    getIndicators.mockResolvedValue({
      services: [createIndicatorService("active", 0.25, 0, 1, true)],
    });
    countServicesByAvailability.mockResolvedValue({
      activeServiceCount: 1,
      noMetricsServiceCount: 0,
      unavailableServiceCount: 0,
    });

    const result = await service.getSummary(
      "2026-10-30T00:00:00.000Z",
      "2026-10-31T00:00:00.000Z",
    );

    expect(result.summary).toMatchObject({
      energyKwh: 0.25,
      emissionsGco2e: 0,
      isPartial: true,
    });
  });

  // Confere falta de end, data inválida e período invertido, sem chamar as dependências.
  it("rejeita período incompleto ou inválido antes de consultar dependências", async () => {
    await expect(
      service.getSummary("2026-10-30T00:00:00.000Z"),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_DASHBOARD_PERIOD",
    });
    await expect(
      service.getSummary(
        "data-inválida",
        "2026-10-31T00:00:00.000Z",
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_DASHBOARD_PERIOD",
    });
    await expect(
      service.getSummary(
        "2026-10-31T00:00:00.000Z",
        "2026-10-30T00:00:00.000Z",
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_DASHBOARD_PERIOD",
    });
    expect(getIndicators).not.toHaveBeenCalled();
    expect(countServicesByAvailability).not.toHaveBeenCalled();
  });
});

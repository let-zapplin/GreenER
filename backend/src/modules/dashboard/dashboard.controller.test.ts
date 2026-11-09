import { beforeEach, describe, expect, it, vi } from "vitest";

// Testa o controller diretamente: service, resposta Express e next são simulados.
// Não envia requisições HTTP nem consulta o banco.
const serviceMocks = vi.hoisted(() => ({
  getSummary: vi.fn(),
}));

vi.mock("./dashboard.service.js", () => ({
  DashboardService: vi.fn(
    class {
      getSummary = serviceMocks.getSummary;
    },
  ),
}));

import { DashboardController } from "./dashboard.controller.js";

// status devolve o próprio objeto para permitir res.status(...).json(...), como no Express.
function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

beforeEach(() => {
  // Limpa as chamadas antes de cada cenário; os resultados do service são configurados nos testes.
  vi.clearAllMocks();
});

describe("DashboardController.getSummary", () => {
  // Sem query, encaminha undefined nas duas datas; o cálculo do período padrão pertence ao service.
  it("retorna o resumo e permite omitir o período", async () => {
    const summary = {
      period: {
        start: new Date("2026-10-30T00:00:00.000Z"),
        end: new Date("2026-10-31T00:00:00.000Z"),
      },
      summary: {
        energyKwh: 0.25,
        emissionsGco2e: 50,
        activeServiceCount: 2,
        noMetricsServiceCount: 1,
        unavailableServiceCount: 1,
        isPartial: false,
      },
    };
    serviceMocks.getSummary.mockResolvedValue(summary);
    const response = createResponse();
    const controller = new DashboardController();

    await controller.getSummary(
      { query: {} } as never,
      response as never,
      vi.fn(),
    );

    expect(serviceMocks.getSummary).toHaveBeenCalledWith(undefined, undefined);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      message: "Dados consolidados do dashboard",
      ...summary,
    });
  });

  // Este cenário envia start como lista de duas datas e confere o erro passado a next,
  // sem chamar o service. Não há execução do middleware global neste teste unitário.
  it("encaminha datas repetidas ou vazias como erro de validação", async () => {
    const next = vi.fn();
    const controller = new DashboardController();

    await controller.getSummary(
      { query: { start: ["data-1", "data-2"], end: "data-3" } } as never,
      createResponse() as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: "INVALID_DASHBOARD_PERIOD",
      }),
    );
    expect(serviceMocks.getSummary).not.toHaveBeenCalled();
  });

  // A rejeição do service deve ser repassada ao next com o mesmo objeto de erro.
  it("encaminha erros do service ao middleware global", async () => {
    const error = new Error("Falha na consulta");
    serviceMocks.getSummary.mockRejectedValue(error);
    const next = vi.fn();
    const controller = new DashboardController();

    await controller.getSummary(
      { query: { start: "2026-10-30", end: "2026-10-31" } } as never,
      createResponse() as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});

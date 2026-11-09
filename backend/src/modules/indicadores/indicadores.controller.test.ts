import { beforeEach, describe, expect, it, vi } from "vitest";

// Testa contratos e validações do controller com métodos do service simulados.
// vi.hoisted permite usar os mocks na fábrica antecipada de vi.mock.
const serviceMocks = vi.hoisted(() => ({
  getIndicators: vi.fn(),
  getServiceHistory: vi.fn(),
}));

vi.mock("./indicadores.service.js", () => ({
  IndicadoresService: vi.fn(
    class {
      getIndicators = serviceMocks.getIndicators;
      getServiceHistory = serviceMocks.getServiceHistory;
    },
  ),
}));

import { IndicadoresController } from "./indicadores.controller.js";

// Simula status encadeável e json para conferir a resposta sem iniciar um servidor.
function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

beforeEach(() => {
  // Zera as chamadas dos mocks; cada cenário define a resposta ou falha que precisa.
  vi.clearAllMocks();
});

describe("IndicadoresController.list", () => {
  // Confere as datas encaminhadas e o corpo passado a json; não executa os cálculos do service.
  it("consulta o service com o período e retorna os indicadores", async () => {
    const indicators = {
      period: { start: new Date("2026-10-30T00:00:00.000Z") },
      summary: { energyKwh: 0.25 },
      services: [],
    };
    serviceMocks.getIndicators.mockResolvedValue(indicators);
    const response = createResponse();
    const controller = new IndicadoresController();

    await controller.list(
      {
        query: {
          start: "2026-10-30T00:00:00.000Z",
          end: "2026-10-31T00:00:00.000Z",
        },
      } as never,
      response as never,
      vi.fn(),
    );

    expect(serviceMocks.getIndicators).toHaveBeenCalledWith(
      "2026-10-30T00:00:00.000Z",
      "2026-10-31T00:00:00.000Z",
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      message: "Indicadores calculados",
      ...indicators,
    });
  });

  // O caso implementado envia start repetido; espera erro de validação em next, sem chamar o service.
  it("encaminha query ausente ou repetida como erro de validação", async () => {
    const next = vi.fn();
    const controller = new IndicadoresController();

    await controller.list(
      { query: { start: ["data-1", "data-2"], end: "data-3" } } as never,
      createResponse() as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: "INVALID_INDICATOR_PERIOD",
      }),
    );
    expect(serviceMocks.getIndicators).not.toHaveBeenCalled();
  });

  // Verifica que o controller repassa o mesmo erro a next; o middleware global não é executado aqui.
  it("encaminha erros do service ao middleware global", async () => {
    const error = new Error("Falha na consulta");
    serviceMocks.getIndicators.mockRejectedValue(error);
    const next = vi.fn();
    const controller = new IndicadoresController();

    await controller.list(
      { query: { start: "2026-10-30", end: "2026-10-31" } } as never,
      createResponse() as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});

// O histórico recebe o ID na rota e o período na query, usando getServiceHistory simulado.
describe("IndicadoresController.history", () => {
  // Confere o ID numérico, as datas encaminhadas e o corpo com identificação do serviço e amostras.
  it("consulta o histórico do serviço com id e período informados", async () => {
    const history = {
      period: {
        start: new Date("2026-11-03T00:00:00.000Z"),
        end: new Date("2026-11-04T00:00:00.000Z"),
        collectionIntervalMs: 60_000,
      },
      service: {
        serviceId: 7,
        name: "Serviço de pedidos",
        status: "active",
        regionCode: "BR-SP",
      },
      samples: [],
    };

    serviceMocks.getServiceHistory.mockResolvedValue(history);

    const response = createResponse();
    const controller = new IndicadoresController();

    await controller.history(
      {
        params: {
          serviceId: "7",
        },
        query: {
          start: "2026-11-03T00:00:00.000Z",
          end: "2026-11-04T00:00:00.000Z",
        },
      } as never,
      response as never,
      vi.fn(),
    );

    expect(serviceMocks.getServiceHistory).toHaveBeenCalledWith(
      7,
      "2026-11-03T00:00:00.000Z",
      "2026-11-04T00:00:00.000Z",
    );

    expect(response.status).toHaveBeenCalledWith(200);

    expect(response.json).toHaveBeenCalledWith({
      message: "Histórico de indicadores calculado",
      ...history,
    });
  });

  // A ausência das datas deve interromper o fluxo antes da chamada ao service.
  it("encaminha período ausente como erro de validação", async () => {
    const next = vi.fn();
    const controller = new IndicadoresController();

    await controller.history(
      {
        params: {
          serviceId: "7",
        },
        query: {},
      } as never,
      createResponse() as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: "INVALID_INDICATOR_PERIOD",
      }),
    );

    expect(serviceMocks.getServiceHistory).not.toHaveBeenCalled();
  });

  // O parâmetro textual "15" deve chegar como número 15 ao service.
  it("converte o identificador da rota para número antes de chamar o service", async () => {
    serviceMocks.getServiceHistory.mockResolvedValue({
      period: {},
      service: {},
      samples: [],
    });

    const controller = new IndicadoresController();

    await controller.history(
      {
        params: {
          serviceId: "15",
        },
        query: {
          start: "2026-11-03T00:00:00.000Z",
          end: "2026-11-04T00:00:00.000Z",
        },
      } as never,
      createResponse() as never,
      vi.fn(),
    );

    expect(serviceMocks.getServiceHistory).toHaveBeenCalledWith(
      15,
      "2026-11-03T00:00:00.000Z",
      "2026-11-04T00:00:00.000Z",
    );
  });

  // Verifica que o controller repassa o mesmo erro a next; o middleware global não é executado aqui.
  it("encaminha erros do service ao middleware global", async () => {
    const error = new Error("Falha na consulta do histórico");

    serviceMocks.getServiceHistory.mockRejectedValue(error);

    const next = vi.fn();
    const controller = new IndicadoresController();

    await controller.history(
      {
        params: {
          serviceId: "7",
        },
        query: {
          start: "2026-11-03T00:00:00.000Z",
          end: "2026-11-04T00:00:00.000Z",
        },
      } as never,
      createResponse() as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});

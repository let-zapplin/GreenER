import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  getIndicators: vi.fn(),
}));

vi.mock("./indicadores.service.js", () => ({
  IndicadoresService: vi.fn(
    class {
      getIndicators = serviceMocks.getIndicators;
    },
  ),
}));

import { IndicadoresController } from "./indicadores.controller.js";

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IndicadoresController.list", () => {
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

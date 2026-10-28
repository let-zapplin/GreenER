import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  discoverIntensities: vi.fn(),
  saveIntensity: vi.fn(),
  listAll: vi.fn(),
}));

vi.mock("./intensidades.service.js", () => ({
  IntensidadesService: vi.fn(class {
    discoverIntensities = serviceMocks.discoverIntensities;
    saveIntensity = serviceMocks.saveIntensity;
    listAll = serviceMocks.listAll;
  }),
}));

import { IntensidadesController } from "./intensidades.controller.js";

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

describe("IntensidadesController", () => {
  it("usa a mesma chave na descoberta e na listagem", async () => {
    const records = [{ region_code: "br-sudeste" }];
    serviceMocks.discoverIntensities.mockResolvedValue(records);
    serviceMocks.listAll.mockResolvedValue(records);
    const controller = new IntensidadesController();
    const response = createResponse();
    const next = vi.fn();

    await controller.discover({} as never, response as never, next);
    expect(response.json).toHaveBeenLastCalledWith(
      expect.objectContaining({ intensities: records }),
    );

    response.json.mockClear();
    await controller.list({} as never, response as never, next);
    expect(response.json).toHaveBeenLastCalledWith(
      expect.objectContaining({ intensities: records }),
    );
  });

  it("responde somente a quantidade de snapshots inseridos", async () => {
    serviceMocks.saveIntensity.mockResolvedValue({ inserted: 3 });
    const controller = new IntensidadesController();
    const response = createResponse();

    await controller.sync({} as never, response as never, vi.fn());

    expect(response.json).toHaveBeenCalledWith({
      message: "Intensidades sincronizadas com sucesso",
      snapshotsInserted: 3,
    });
  });

  it("encaminha erros ao middleware global", async () => {
    const error = new Error("Falha na consulta");
    serviceMocks.discoverIntensities.mockRejectedValue(error);
    const next = vi.fn();
    const controller = new IntensidadesController();

    await controller.discover({} as never, createResponse() as never, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
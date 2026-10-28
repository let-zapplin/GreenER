import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServicosService, type ExternalService } from "./servicos.service.js";
import { ExternalApiError } from "../../shared/errors/AppError.js";

const {
  findLocationByRegionMock,
  createLocationMock,
  findByExternalIdMock,
  createServiceMock,
  updateServiceMock,
  markRemovedExceptMock,
} = vi.hoisted(() => ({
  findLocationByRegionMock: vi.fn(),
  createLocationMock: vi.fn(),
  findByExternalIdMock: vi.fn(),
  createServiceMock: vi.fn(),
  updateServiceMock: vi.fn(),
  markRemovedExceptMock: vi.fn(),
}));

// A descoberta não precisa acessar o banco de dados.
vi.mock("./servicos.repository.js", () => ({
  ServicosRepository: class {
    findLocationByRegion = findLocationByRegionMock;
    createLocation = createLocationMock;
    findByExternalId = findByExternalIdMock;
    createService = createServiceMock;
    updateService = updateServiceMock;
    markRemovedExcept = markRemovedExceptMock;
  },
}));

// Evita depender das variáveis de ambiente reais.
vi.mock("../../config/env.js", () => ({
  env: {
    metricsApiUrl: "https://metrics.exemplo",
    externalApiTimeoutMs: 5000,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ServicosService.discoverServices", () => {
  it("retorna os serviços recebidos da API", async () => {
    // Preparar: definir os dados e a resposta simulada.
    const services: ExternalService[] = [
      {
        id: "servico-1",
        name: "API de pedidos",
        location: {
          region_code: "BR-SP",
          country: "Brasil",
          region: "São Paulo",
          city: "São Paulo",
          latitude: -23.55,
          longitude: -46.63,
        },
        metrics_path: "/services/servico-1/metrics",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(services), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    // Executar: chamar o método real.
    const result = await new ServicosService().discoverServices();

    // Verificar: conferir o resultado e a URL consultada.
    expect(result).toEqual(services);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://metrics.exemplo/services",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("lança ExternalApiError quando a API retorna HTTP 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        }),
      ),
    );

    await expect(
      new ServicosService().discoverServices(),
    ).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("lança ExternalApiError quando a conexão falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Falha de conexão")),
    );

    await expect(
      new ServicosService().discoverServices(),
    ).rejects.toBeInstanceOf(ExternalApiError);
  });
  it("cancela a requisição ao atingir o timeout e lança ExternalApiError", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;

    // Simula uma requisição pendente que só falha quando é cancelada.
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation((_url, options) => {
        requestSignal = options?.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          requestSignal?.addEventListener(
            "abort",
            () =>
              reject(new DOMException("Requisição cancelada", "AbortError")),
            { once: true },
          );
        });
      });
    vi.stubGlobal("fetch", fetchMock);

    // Trata a rejeição antes de avançar o relógio para o timeout.
    const rejection = expect(
      new ServicosService().discoverServices(),
    ).rejects.toBeInstanceOf(ExternalApiError);

    expect(requestSignal).toBeInstanceOf(AbortSignal);
    await vi.advanceTimersByTimeAsync(4999);
    expect(requestSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(requestSignal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("ServicosService.saveServices", () => {
  it("converte o código regional externo ao criar uma localização", async () => {
    const services: ExternalService[] = [
      {
        id: "servico-1",
        name: "API de pedidos",
        location: {
          region_code: "BR-SP",
          country: "Brasil",
          region: "São Paulo",
          city: "São Paulo",
          latitude: -23.55,
          longitude: -46.63,
        },
        metrics_path: "/services/servico-1/metrics",
      },
    ];
    const service = new ServicosService();
    vi.spyOn(service, "discoverServices").mockResolvedValue(services);
    findLocationByRegionMock.mockResolvedValue(null);
    createLocationMock.mockResolvedValue({ id_location: 1 });
    findByExternalIdMock.mockResolvedValue(null);
    markRemovedExceptMock.mockResolvedValue(0);

    await service.saveServices();

    expect(createLocationMock).toHaveBeenCalledWith({
      regionCode: "BR-SP",
      country: "Brasil",
      region: "São Paulo",
      city: "São Paulo",
      latitude: -23.55,
      longitude: -46.63,
    });
  });

  it("mantém serviço existente ativo e marca como removidos apenas os ausentes", async () => {
    const services: ExternalService[] = [
      {
        id: "servico-1",
        name: "API de pedidos",
        location: {
          region_code: "BR-SP",
          country: "Brasil",
          region: "São Paulo",
          city: "São Paulo",
          latitude: -23.55,
          longitude: -46.63,
        },
        metrics_path: "/services/servico-1/metrics",
      },
    ];

    const service = new ServicosService();

    vi.spyOn(service, "discoverServices").mockResolvedValue(services);

    findLocationByRegionMock.mockResolvedValue({
      id_location: 1,
    });

    findByExternalIdMock.mockResolvedValue({
      id_service: 10,
      id: "servico-1",
    });

    markRemovedExceptMock.mockResolvedValue(2);

    const result = await service.saveServices();

    expect(updateServiceMock).toHaveBeenCalledWith({
      id: "servico-1",
      name: "API de pedidos",
      locationId: 1,
    });

    expect(markRemovedExceptMock).toHaveBeenCalledWith(["servico-1"]);

    expect(result).toEqual({
      created: 0,
      updated: 1,
      removed: 2,
    });
  });

  it("marca os serviços persistidos como removidos quando o catálogo vem vazio", async () => {
    const service = new ServicosService();

    vi.spyOn(service, "discoverServices").mockResolvedValue([]);

    markRemovedExceptMock.mockResolvedValue(8);

    const result = await service.saveServices();

    expect(markRemovedExceptMock).toHaveBeenCalledWith([]);

    expect(createServiceMock).not.toHaveBeenCalled();
    expect(updateServiceMock).not.toHaveBeenCalled();

    expect(result).toEqual({
      created: 0,
      updated: 0,
      removed: 8,
    });
  });
});

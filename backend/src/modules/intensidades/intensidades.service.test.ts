import { afterEach, describe, expect, it, vi } from "vitest";
import { ServicosService, type ExternalService } from "./intensidades.service.js";
import { ExternalApiError } from "../../shared/errors/AppError.js";

// A descoberta não precisa acessar o banco de dados.
vi.mock("./servicos.repository.js", () => ({
  ServicosRepository: vi.fn(class {}),
}));

// Evita depender das variáveis de ambiente reais.
vi.mock("../../config/env.js", () => ({
  env: {
    metricsApiUrl: "https://metrics.exemplo",
    externalApiTimeoutMs: 5000,
  },
}));

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

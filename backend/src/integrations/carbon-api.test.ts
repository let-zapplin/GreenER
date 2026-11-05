import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalApiError } from "../shared/errors/AppError.js";

// Testa a função real de integração, mas substitui fetch para não acessar a API externa.
// A configuração fixa dispensa as variáveis do .env e define um timeout de 5 segundos.
vi.mock("../config/env.js", () => ({
  env: {
    carbonApiUrl: "https://carbon.example/",
    externalApiTimeoutMs: 5000,
  },
}));

import { fetchCarbonRegions } from "./carbon-api.js";

// Catálogo fictício com os campos exigidos pelo contrato da Carbon API.
// Serve como resposta conhecida para o sucesso e como base para os cenários inválidos.
const catalog = {
  regions: [
    {
      code: "br-sudeste",
      country: "Brazil",
      region: "Sudeste",
      city: "Sao Paulo",
      latitude: -23.5505,
      longitude: -46.6333,
      carbon_intensity_gco2e_per_kwh: 85,
      renewable_share_percent: 83,
    },
  ],
  total: 1,
};

afterEach(() => {
  // Restaura fetch e os temporizadores para não interferir nos testes seguintes.
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchCarbonRegions", () => {
  it("retorna catálogo válido e consulta /regions com timeout", async () => {
    // Monta uma resposta HTTP 200 com JSON válido, sem fazer uma chamada de rede.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(catalog), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    // Substitui a função global fetch pela simulação usada pela integração real.
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCarbonRegions()).resolves.toEqual(catalog);
    // Confere a URL montada e o sinal que permite cancelar a requisição.
    // O cancelamento ao fim do prazo é verificado no último teste deste arquivo.
    expect(fetchMock).toHaveBeenCalledWith(
      "https://carbon.example/regions",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejeita envelope ou campos malformados", async () => {
    // O envelope existe, mas a região contém apenas code e não atende ao contrato.
    // Mesmo com HTTP 200, a integração deve rejeitar o conteúdo incompleto.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...catalog, regions: [{ code: "x" }] }), {
          status: 200,
        }),
      ),
    );

    await expect(fetchCarbonRegions()).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("rejeita códigos regionais duplicados", async () => {
    // Repete a mesma região; total corresponde ao tamanho da lista, mas os códigos
    // duplicados tornam o catálogo inválido.
    const duplicatedCatalog = {
      regions: [catalog.regions[0], catalog.regions[0]],
      total: 2,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(duplicatedCatalog), { status: 200 }),
      ),
    );

    await expect(fetchCarbonRegions()).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("converte falha HTTP em erro explícito da API externa", async () => {
    // fetch resolve normalmente, mas o status 503 indica falha do servidor externo.
    // A função deve transformar essa resposta em ExternalApiError.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(fetchCarbonRegions()).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("converte falha de conexão em erro explícito da API externa", async () => {
    // Diferentemente do erro HTTP, uma falha de conexão rejeita a própria Promise
    // de fetch. O erro também deve ser exposto como ExternalApiError.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));

    await expect(fetchCarbonRegions()).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("aborta a requisição ao atingir o timeout", async () => {
    // Controla o relógio do teste para não esperar cinco segundos reais.
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_url, options) => {
      requestSignal = options?.signal ?? undefined;
      // Mantém a requisição pendente até o AbortController cancelar seu sinal.
      // A simulação rejeita com AbortError, reproduzindo o comportamento de fetch.
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Request aborted", "AbortError")),
          { once: true },
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Registra a verificação da rejeição antes de avançar o relógio, evitando
    // que a falha esperada seja tratada como uma rejeição não acompanhada.
    const rejection = expect(fetchCarbonRegions()).rejects.toBeInstanceOf(ExternalApiError);
    await vi.advanceTimersByTimeAsync(5000);
    await rejection;

    // Confere o cancelamento e que nenhum temporizador ficou pendente.
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

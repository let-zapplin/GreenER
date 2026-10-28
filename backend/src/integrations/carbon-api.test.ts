import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalApiError } from "../shared/errors/AppError.js";

vi.mock("../config/env.js", () => ({
  env: {
    carbonApiUrl: "https://carbon.example/",
    externalApiTimeoutMs: 5000,
  },
}));

import { fetchCarbonRegions } from "./carbon-api.js";

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
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchCarbonRegions", () => {
  it("retorna catálogo válido e consulta /regions com timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(catalog), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCarbonRegions()).resolves.toEqual(catalog);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://carbon.example/regions",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejeita envelope ou campos malformados", async () => {
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(fetchCarbonRegions()).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("converte falha de conexão em erro explícito da API externa", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));

    await expect(fetchCarbonRegions()).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("aborta a requisição ao atingir o timeout", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_url, options) => {
      requestSignal = options?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Request aborted", "AbortError")),
          { once: true },
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const rejection = expect(fetchCarbonRegions()).rejects.toBeInstanceOf(ExternalApiError);
    await vi.advanceTimersByTimeAsync(5000);
    await rejection;

    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
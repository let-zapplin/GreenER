import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchServiceMetrics } from "./metrics-api.js";

vi.mock("../config/env.js", () => ({
  env: {
    metricsApiUrl: "https://metrics.exemplo",
    externalApiTimeoutMs: 5000,
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchServiceMetrics", () => {
  it("consulta o serviço e normaliza as métricas recebidas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          collection_interval_seconds: 30,
          metrics: {
            cpu_percent: 24.5,
            memory_gb: 8,
            disk_gb: 100,
            network_gb: 12,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchServiceMetrics("service/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://metrics.exemplo/metrics/service%2F1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toMatchObject({
      status: "success",
      data: {
        cpu_percent: 24.5,
        memory_gb: 8,
        disk_gb: 100,
        network_gb: 12,
      },
    });
    if (result.status === "success") {
      expect(Number.isNaN(Date.parse(result.data.recorded_at))).toBe(false);
    }
  });

  it("classifica serviço sem métricas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ metrics: {} }), { status: 200 }),
      ),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toEqual({
      status: "no_metrics",
      http_status: 200,
    });
  });

  it("classifica HTTP 404 como serviço sem métricas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toEqual({
      status: "no_metrics",
      http_status: 404,
    });
  });

  it("retorna um erro compreensível quando a API responde com erro HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toEqual({
      status: "error",
      failure_reason: "A API de métricas respondeu com HTTP 503.",
      http_status: 503,
    });
  });

  it("rejeita payload com métricas incompletas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ metrics: { cpu_percent: 12 } }),
          { status: 200 },
        ),
      ),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toMatchObject({
      status: "error",
      failure_reason:
        "A API de métricas retornou dados incompletos ou em formato inválido.",
      http_status: 200,
    });
  });

  it("retorna uma mensagem compreensível quando o JSON é inválido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{invalid-json", { status: 200 }),
      ),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toEqual({
      status: "error",
      failure_reason: "A API de métricas retornou um JSON inválido.",
      http_status: 200,
    });
  });

  it("retorna uma mensagem compreensível quando a conexão falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network failure")),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toEqual({
      status: "error",
      failure_reason: "Não foi possível conectar à API de métricas.",
    });
  });

  it("trata timeout sem deixar o timer ativo", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_url, options) => {
      requestSignal = options?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchServiceMetrics("service-1");
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result).toEqual({
      status: "error",
      failure_reason: "A consulta à API de métricas excedeu o tempo limite.",
    });
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchServiceMetrics } from "./metrics-api.js";

// Testa a integração real com respostas de fetch simuladas, sem acessar a API externa.
// Define URL e timeout fixos para não depender das variáveis do ambiente real.
vi.mock("../config/env.js", () => ({
  env: {
    metricsApiUrl: "https://metrics.exemplo",
    externalApiTimeoutMs: 5000,
  },
}));

afterEach(() => {
  // Restaura fetch e os temporizadores depois de cada cenário.
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchServiceMetrics", () => {
  it("consulta o serviço e normaliza as métricas recebidas", async () => {
    // Simula HTTP 200 com métricas aninhadas e duração da amostra fora de metrics,
    // conforme o formato que a função deve transformar em dados normalizados.
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
    // Substitui fetch globalmente; a função importada continua sendo a implementação real.
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchServiceMetrics("service/1");

    // A barra no identificador deve virar %2F para não criar outro segmento na URL.
    // O AbortSignal permite cancelar a requisição se o prazo for atingido.
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
        collection_interval_seconds: 30,
      },
    });
    if (result.status === "success") {
      // Confere se recorded_at, gerado pelo backend, pode ser interpretado como data.
      expect(Number.isNaN(Date.parse(result.data.recorded_at))).toBe(false);
    }
  });

  it("rejeita intervalo ausente, inválido ou não positivo", async () => {
    // Mantém as métricas válidas e varia somente a duração para verificar sua validação.
    // Na serialização JSON, undefined omite o campo e Infinity é convertido em null.
    const invalidIntervals: unknown[] = [
      undefined,
      null,
      0,
      -1,
      "30",
      Number.POSITIVE_INFINITY,
    ];

    for (const interval of invalidIntervals) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              collection_interval_seconds: interval,
              metrics: {
                cpu_percent: 24.5,
                memory_gb: 8,
                disk_gb: 100,
                network_gb: 12,
              },
            }),
            { status: 200 },
          ),
        ),
      );

      // A função devolve status error; não lança uma exceção para esse erro de contrato.
      await expect(fetchServiceMetrics("service-1")).resolves.toMatchObject({
        status: "error",
        failure_reason:
          "A API de métricas retornou dados incompletos ou em formato inválido.",
      });
    }
  });

  it("classifica serviço sem métricas", async () => {
    // Um objeto metrics vazio representa ausência de métricas, mesmo com HTTP 200.
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
    // Verifica a classificação de 404 adotada pela integração, sem consultar o catálogo.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toEqual({
      status: "no_metrics",
      http_status: 404,
    });
  });

  it("classifica HTTP 500 como serviço indisponível", async () => {
    // O contrato tratado pelo projeto diferencia HTTP 500 (unavailable) de no_metrics.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toEqual({
      status: "unavailable",
      failure_reason:
        "A API de métricas informou serviço ou exportador de métricas indisponível.",
      http_status: 500,
    });
  });

  it("retorna um erro compreensível quando a API responde com erro HTTP inesperado", async () => {
    // HTTP 503 não segue os tratamentos especiais de 404 e 500: retorna status error,
    // preservando o código HTTP e um motivo compreensível.
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
    // HTTP 200 e JSON válido não bastam: o payload contém somente CPU e está incompleto.
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
    // Simula texto que não pode ser convertido em JSON. A falha deve ser classificada
    // como erro de resposta, sem ser confundida com indisponibilidade de conexão.
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

  it("sinaliza indisponibilidade quando a conexão falha", async () => {
    // Ao contrário de uma resposta HTTP de erro, a falha de rede rejeita a Promise
    // de fetch. A integração trata essa rejeição e devolve status unavailable.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network failure")),
    );

    await expect(fetchServiceMetrics("service-1")).resolves.toEqual({
      status: "unavailable",
      failure_reason: "Não foi possível conectar à API de métricas.",
    });
  });

  it("trata timeout sem deixar o timer ativo", async () => {
    // Controla o relógio para testar o prazo sem esperar cinco segundos reais.
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_url, options) => {
      requestSignal = options?.signal ?? undefined;
      // A requisição fica pendente até receber o evento de cancelamento.
      // Nesse momento, rejeita com AbortError, como fetch faria ao ser abortado.
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Inicia a consulta e avança o relógio até o timeout. A implementação captura
    // o AbortError e resolve a operação com o resultado de indisponibilidade.
    const resultPromise = fetchServiceMetrics("service-1");
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result).toEqual({
      status: "unavailable",
      failure_reason: "A consulta à API de métricas excedeu o tempo limite.",
    });
    // Confere o cancelamento e a ausência de temporizadores pendentes após o término.
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

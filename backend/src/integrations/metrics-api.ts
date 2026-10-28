import { env } from "../config/env.js";

// 1. Tipagem EXATA do que a API retorna (incluindo o objeto aninhado)
export interface ExternalMetricsResponse {
  collection_interval_seconds: number;
  metrics?: {
    cpu_percent: number;
    memory_gb: number;
    disk_gb: number;
    network_gb: number;
  } | null;
}

// O que vamos salvar no banco (já "desaninhado")
export interface NormalizedMetric {
  cpu_percent: number;
  memory_gb: number;
  disk_gb: number;
  network_gb: number;
  recorded_at: string;
}

export type FetchMetricResult =
  | { status: "success"; data: NormalizedMetric }
  | { status: "no_metrics"; http_status: number }
  | { status: "unavailable"; failure_reason: string; http_status?: number }
  | { status: "error"; failure_reason: string; http_status?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMetricPayload(
  value: unknown,
): value is { metrics: NonNullable<ExternalMetricsResponse["metrics"]> } {
  if (!isRecord(value) || !isRecord(value.metrics)) return false;

  return (
    typeof value.metrics.cpu_percent === "number" &&
    Number.isFinite(value.metrics.cpu_percent) &&
    typeof value.metrics.memory_gb === "number" &&
    Number.isFinite(value.metrics.memory_gb) &&
    typeof value.metrics.disk_gb === "number" &&
    Number.isFinite(value.metrics.disk_gb) &&
    typeof value.metrics.network_gb === "number" &&
    Number.isFinite(value.metrics.network_gb)
  );
}

export async function fetchServiceMetrics(
  serviceId: string,
): Promise<FetchMetricResult> {
  const url = `${env.metricsApiUrl}/metrics/${encodeURIComponent(serviceId)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.externalApiTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (response.status === 404) {
      return { status: "no_metrics", http_status: 404 };
    }

    if (!response.ok) {
      return {
        status: "error",
        failure_reason: `A API de métricas respondeu com HTTP ${response.status}.`,
        http_status: response.status,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        status: "error",
        failure_reason: "A API de métricas retornou um JSON inválido.",
        http_status: response.status,
      };
    }

    if (
      isRecord(data) &&
      (data.metrics === undefined ||
        data.metrics === null ||
        (isRecord(data.metrics) && Object.keys(data.metrics).length === 0))
    ) {
      return { status: "no_metrics", http_status: response.status };
    }

    if (!isMetricPayload(data)) {
      return {
        status: "error",
        failure_reason:
          "A API de métricas retornou dados incompletos ou em formato inválido.",
        http_status: response.status,
      };
    }

    const normalizedData: NormalizedMetric = {
      cpu_percent: data.metrics.cpu_percent,
      memory_gb: data.metrics.memory_gb,
      disk_gb: data.metrics.disk_gb,
      network_gb: data.metrics.network_gb,
      recorded_at: new Date().toISOString(),
    };

    return { status: "success", data: normalizedData };
  } catch (error: unknown) {
    // Falha de comunicação: o serviço não respondeu dentro do tempo
    // ou a conexão foi recusada. Não é erro de processamento.
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return {
      status: "unavailable",
      failure_reason: isTimeout
        ? "A consulta à API de métricas excedeu o tempo limite."
        : "Não foi possível conectar à API de métricas.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
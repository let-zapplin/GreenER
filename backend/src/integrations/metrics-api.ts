import { env } from "../config/env.js";

// 1. Tipagem EXATA do que a API retorna (incluindo o objeto aninhado)
export interface ExternalMetricsResponse {
  collection_interval_seconds: number;
  metrics: {
    cpu_percent: number;
    memory_gb: number;
    disk_gb: number;
    network_gb: number;
  };
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
  | { status: 'success'; data: NormalizedMetric }
  | { status: 'no_metrics'; http_status: number }
  | { status: 'error'; failure_reason: string; http_status?: number };

export async function fetchServiceMetrics(serviceId: string): Promise<FetchMetricResult> {
  const url = `${env.metricsApiUrl}/metrics/${serviceId}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.externalApiTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (response.status === 404) {
      return { status: 'no_metrics', http_status: 404 };
    }

    if (!response.ok) {
      return { status: 'error', failure_reason: `HTTP ${response.status}`, http_status: response.status };
    }

    const data = await response.json() as ExternalMetricsResponse;
    
    // Se o objeto metrics não existir ou estiver vazio, consideramos no_metrics
    if (!data.metrics || Object.keys(data.metrics).length === 0) {
        return { status: 'no_metrics', http_status: 200 };
    }

    // 2. Extração limpa e direta (sem adivinhação)
    const normalizedData: NormalizedMetric = {
      cpu_percent: data.metrics.cpu_percent,
      memory_gb: data.metrics.memory_gb,
      disk_gb: data.metrics.disk_gb,
      network_gb: data.metrics.network_gb,
      recorded_at: new Date().toISOString() // A API não manda a data, então usamos a hora atual
    };

    return { status: 'success', data: normalizedData };

  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return { 
      status: 'error', 
      failure_reason: isTimeout ? 'Timeout na requisição' : 'Falha de conexão' 
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
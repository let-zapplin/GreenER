// ============================================================
// CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE
// Centraliza e valida todas as variáveis do .env
// ============================================================

function required(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`❌ Variável obrigatória não definida: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

// Intervalos vazios, zero ou negativos gerariam ciclos apertados
// de requisição, então falhamos cedo na inicialização.
function optionalPositiveInt(key: string, defaultValue: number): number {
  const raw = process.env[key]?.trim();

  if (!raw) {
    return defaultValue;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`❌ Variável ${key} deve ser um número inteiro positivo`);
  }

  return value;
}

const carbonIntensityMaxAgeValue = process.env.CARBON_INTENSITY_MAX_AGE_MS;

const carbonIntensityMaxAgeMs =
  carbonIntensityMaxAgeValue === undefined ||
  carbonIntensityMaxAgeValue.trim() === ""
    ? undefined
    : Number(carbonIntensityMaxAgeValue);

if (
  carbonIntensityMaxAgeMs !== undefined &&
  (!Number.isFinite(carbonIntensityMaxAgeMs) || carbonIntensityMaxAgeMs < 0)
) {
  throw new Error(
    "CARBON_INTENSITY_MAX_AGE_MS deve ser um número não negativo",
  );
}

export const env = {
  // Servidor
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "3000")),

  // APIs externas
  metricsApiUrl: required("METRICS_API_URL"),
  carbonApiUrl: required("CARBON_API_URL"),
  externalApiTimeoutMs: Number(optional("EXTERNAL_API_TIMEOUT_MS", "5000")),
  carbonIntensityMaxAgeMs,

  // Monitoramento
  serviceSyncIntervalMs: optionalPositiveInt(
    "SERVICE_SYNC_INTERVAL_MS",
    300_000,
  ),
  metricsCollectionIntervalMs: optionalPositiveInt(
    "COLLECTION_INTERVAL_MS",
    60_000,
  ),
} as const;

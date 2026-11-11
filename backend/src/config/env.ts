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

function optionalBoolean(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();

  if (!raw) {
    return defaultValue;
  }

  if (["true", "1", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(raw)) {
    return false;
  }

  throw new Error(`❌ Variável ${key} deve ser booleana`);
}

// Vazio/ausente usa 15 minutos; valor não numérico ou negativo interrompe a inicialização.
const carbonIntensityMaxAgeValue = process.env.CARBON_INTENSITY_MAX_AGE_MS;

const carbonIntensityMaxAgeMs =
  carbonIntensityMaxAgeValue === undefined ||
  carbonIntensityMaxAgeValue.trim() === ""
    ? 900_000
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
  // Limite, em ms, aplicado ao AbortController das chamadas às APIs externas.
  externalApiTimeoutMs: Number(optional("EXTERNAL_API_TIMEOUT_MS", "5000")),
  carbonIntensityMaxAgeMs,

  // Monitoramento
  serviceSyncIntervalMs: optionalPositiveInt(
    "SERVICE_SYNC_INTERVAL_MS",
    300_000,
  ),
  carbonIntensitySyncIntervalMs: optionalPositiveInt(
    "CARBON_INTENSITY_SYNC_INTERVAL_MS",
    300_000,
  ),
  metricsCollectionIntervalMs: optionalPositiveInt(
    "COLLECTION_INTERVAL_MS",
    60_000,
  ),

  // Assistente com Ollama (LLM local, sem custo por requisição)
  ollamaUrl: optional("OLLAMA_URL", "http://localhost:11434"),
  ollamaModel: optional("OLLAMA_MODEL", "qwen2.5:3b"),
  ollamaTimeoutMs: optionalPositiveInt("OLLAMA_TIMEOUT_MS", 60_000),
  ollamaEnabled: optionalBoolean("OLLAMA_ENABLED", true),
} as const;

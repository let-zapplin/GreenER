//	Faz a comunicação HTTP com o Ollama

import { performance } from "node:perf_hooks";
import { env } from "../../config/env.js";
import {
  ANSWER_SYSTEM_PROMPT,
  CLASSIFIER_SYSTEM_PROMPT,
  buildAnswerUserPrompt,
  buildClassifierUserPrompt,
  extractJsonObject,
} from "./chat.prompt.js";
import {
  CHAT_INTENTS,
  CHAT_RESOURCE_METRICS,
  type ChatClassification,
  type ChatHistoryMessage,
  type ChatIntent,
  type ChatLlm,
  type ChatResourceMetric,
} from "./chat.types.js";

type OllamaClientOptions = {
  enabled: boolean;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  numCtx: number;
};

type OllamaResponse = {
  message?: {
    content?: unknown;
  };
};

function parseClassification(text: string): ChatClassification | null {
  const parsed = extractJsonObject(text);

  if (parsed === null || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const intent = record.intent;

  if (
    typeof intent !== "string" ||
    !(CHAT_INTENTS as readonly string[]).includes(intent)
  ) {
    return null;
  }

  const serviceName =
    typeof record.serviceName === "string" ? record.serviceName : null;
  const compareWith =
    typeof record.compareWith === "string" ? record.compareWith : null;
  const metric =
    typeof record.metric === "string" &&
    (CHAT_RESOURCE_METRICS as readonly string[]).includes(record.metric)
      ? (record.metric as ChatResourceMetric)
      : null;

  return {
    intent: intent as ChatIntent,
    serviceName,
    compareWith,
    metric,
  };
}

// Cliente HTTP mínimo do Ollama. Falhas de rede, timeout ou JSON inválido
// viram null para que o service siga com as regras determinísticas.
export class OllamaClient implements ChatLlm {
  readonly enabled: boolean;
  readonly model: string;

  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly numCtx: number;

  constructor(options: Partial<OllamaClientOptions> = {}) {
    this.baseUrl = (options.baseUrl ?? env.ollamaUrl).replace(/\/$/, "");
    this.model = options.model ?? env.ollamaModel;
    this.timeoutMs = options.timeoutMs ?? env.ollamaTimeoutMs;
    this.numCtx = options.numCtx ?? env.ollamaNumCtx ?? 4_096;
    this.enabled = options.enabled ?? env.ollamaEnabled;
  }

  async classify(
    message: string,
    serviceNames: string[],
    history: ChatHistoryMessage[] = [],
  ): Promise<ChatClassification | null> {
    if (!this.enabled) {
      return null;
    }

    const content = await this.chat({
      operation: "classification",
      system: CLASSIFIER_SYSTEM_PROMPT,
      history: history.slice(-6),
      user: buildClassifierUserPrompt(message, serviceNames),
      temperature: 0,
      numPredict: 140,
      format: "json",
    });

    if (content === null) {
      return null;
    }

    const classification = parseClassification(content);
    if (classification === null) {
      console.warn(
        "⚠️ Ollama retornou uma classificação inválida; usando modo regras.",
      );
    }

    return classification;
  }

  async answer(
    question: string,
    context: unknown,
    history: ChatHistoryMessage[] = [],
  ): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    return this.chat({
      operation: "answer",
      system: ANSWER_SYSTEM_PROMPT,
      history: history.slice(-4),
      user: buildAnswerUserPrompt(question, context),
      temperature: 0.2,
      numPredict: 220,
    });
  }

  // Carrega o modelo antes da primeira pergunta para não pagar o tempo de
  // load na primeira requisição do usuário.
  async warmup(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const content = await this.chat({
      operation: "warmup",
      system: "Responda apenas com ok.",
      history: [],
      user: "ok",
      temperature: 0,
      numPredict: 1,
    });

    return content !== null;
  }

  private async chat({
    operation,
    system,
    history,
    user,
    temperature,
    numPredict,
    format,
  }: {
    operation: "classification" | "answer" | "warmup";
    system: string;
    history: ChatHistoryMessage[];
    user: string;
    temperature: number;
    numPredict: number;
    format?: "json";
  }): Promise<string | null> {
    const startedAt = performance.now();
    let outcome:
      | "success"
      | "http_error"
      | "invalid_response"
      | "timeout"
      | "request_error" = "request_error";
//nesse try catch nós chamamos o Ollama, mas caso ele não responda a Karma continua funcionando no modo regras deterministicas, é uma técnica de "graceful degradation" O sistema perde uma capacidade, mas não para completamente.
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: system },
            ...history.map((entry) => ({
              role: entry.role,
              content: entry.content,
            })),
            { role: "user", content: user },
          ],
          stream: false,
          keep_alive: "30m",
          ...(format ? { format } : {}),
          options: {
            temperature,
            num_predict: numPredict,
            num_ctx: this.numCtx,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        outcome = "http_error";
        console.warn(
          `⚠️ Ollama ${operation} respondeu HTTP ${response.status}; usando modo regras.`,
        );
        return null;
      }

      const data = (await response.json()) as OllamaResponse;
      const content = data.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        outcome = "invalid_response";
        console.warn(
          `⚠️ Ollama ${operation} retornou conteúdo inválido; usando modo regras.`,
        );
        return null;
      }

      outcome = "success";
      return content;
    } catch (error) {
      const timedOut =
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError");
      outcome = timedOut ? "timeout" : "request_error";
      console.warn(
        `⚠️ Ollama ${operation} ${timedOut ? "atingiu o timeout" : "falhou"}; usando modo regras.`,
      );
      return null;
    } finally {
      const latencyMs = Math.round(performance.now() - startedAt);
      console.log(
        `Ollama ${operation} latency_ms=${latencyMs} outcome=${outcome}`,
      );
    }
  }
}

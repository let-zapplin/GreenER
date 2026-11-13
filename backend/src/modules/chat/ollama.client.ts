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
  type ChatClassification,
  type ChatHistoryMessage,
  type ChatIntent,
  type ChatLlm,
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

  return {
    intent: intent as ChatIntent,
    serviceName,
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
      system: CLASSIFIER_SYSTEM_PROMPT,
      history: history.slice(-6),
      user: buildClassifierUserPrompt(message, serviceNames),
      temperature: 0,
      numPredict: 140,
      format: "json",
    });

    return content === null ? null : parseClassification(content);
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
      system: "Responda apenas com ok.",
      history: [],
      user: "ok",
      temperature: 0,
      numPredict: 1,
    });

    return content !== null;
  }

  private async chat({
    system,
    history,
    user,
    temperature,
    numPredict,
    format,
  }: {
    system: string;
    history: ChatHistoryMessage[];
    user: string;
    temperature: number;
    numPredict: number;
    format?: "json";
  }): Promise<string | null> {
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
        console.warn(
          `⚠️ Ollama respondeu ${response.status}; usando resposta determinística.`,
        );
        return null;
      }

      const data = (await response.json()) as OllamaResponse;
      return typeof data.message?.content === "string"
        ? data.message.content
        : null;
    } catch (error) {
      console.warn(
        "⚠️ Ollama indisponível; usando resposta determinística.",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }
}

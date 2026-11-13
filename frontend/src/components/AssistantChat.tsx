import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../services/api";
import { askAssistant } from "../services/chatApi";
import { CHAT_PERIODS } from "../types/chat";
import type {
  ChatChart,
  ChatHistoryMessage,
  ChatPeriod,
  ChatResponse,
} from "../types/chat";
import "./AssistantChat.css";

const REQUEST_TIMEOUT_MS = 75_000;
const HISTORY_LIMIT = 6;

const PERIOD_LABELS: Record<ChatPeriod, string> = {
  "1h": "1 hora",
  "6h": "6 horas",
  "24h": "24 horas",
  "7d": "7 dias",
};

const SUGGESTIONS = [
  "Qual serviço gasta mais energia?",
  "Qual serviço emite mais CO₂?",
  "Resumo ambiental do período",
  "O que é o GreenER?",
  "Como o CO₂ é calculado?",
];

type ChatEntry =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; reply: ChatResponse }
  | { id: number; role: "assistant"; error: string };

type AssistantMessageProps = {
  reply: ChatResponse;
  disabled: boolean;
  onAsk: (message: string, period?: ChatPeriod) => void;
};

function buildHistory(entries: ChatEntry[]): ChatHistoryMessage[] {
  return entries
    .flatMap<ChatHistoryMessage>((entry) => {
      if (entry.role === "user") {
        return [{ role: "user", content: entry.text }];
      }

      if ("reply" in entry) {
        return [{ role: "assistant", content: entry.reply.answer.slice(0, 500) }];
      }

      return [];
    })
    .slice(-HISTORY_LIMIT);
}

function formatChartValue(value: number): string {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 4,
  });
}

function ChatChartView({ chart }: { chart: ChatChart }) {
  const hasValues = chart.data.some((point) => point.value !== null);

  return (
    <figure className="assistant-chat-chart">
      <figcaption>
        <strong>{chart.title}</strong>
        <span>{chart.unit}</span>
      </figcaption>

      {hasValues ? (
        <div className="assistant-chat-chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === "bar" ? (
              <BarChart
                data={chart.data}
                margin={{ top: 8, right: 8, bottom: 8, left: -12 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9ab0a4", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  height={46}
                  tickFormatter={(value: string) =>
                    value.length > 14 ? `${value.slice(0, 14)}…` : value
                  }
                />
                <YAxis
                  tick={{ fill: "#9ab0a4", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(135, 228, 108, 0.08)" }}
                  contentStyle={{
                    background: "#0f3033",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: 10,
                    color: "#f4f8f5",
                  }}
                  formatter={(value) => [
                    `${typeof value === "number" ? formatChartValue(value) : String(value)} ${chart.unit}`,
                    "Valor",
                  ]}
                />
                <Bar
                  dataKey="value"
                  fill="#87e46c"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                  animationDuration={450}
                />
              </BarChart>
            ) : (
              <LineChart
                data={chart.data}
                margin={{ top: 8, right: 8, bottom: 8, left: -12 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9ab0a4", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: "#9ab0a4", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f3033",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: 10,
                    color: "#f4f8f5",
                  }}
                  formatter={(value) => [
                    `${typeof value === "number" ? formatChartValue(value) : String(value)} ${chart.unit}`,
                    "Valor",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#87e46c"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={450}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="assistant-chat-chart-empty">Sem valores no período.</p>
      )}
    </figure>
  );
}

function AssistantMessage({
  reply,
  disabled,
  onAsk,
}: AssistantMessageProps) {
  return (
    <article className="assistant-chat-message assistant-chat-message-assistant">
      <p>{reply.answer}</p>

      {reply.chart !== null && <ChatChartView chart={reply.chart} />}

      {reply.clarification !== null && (
        <div
          className="assistant-chat-clarification"
          role="group"
          aria-label="Opções de serviço"
        >
          {reply.clarification.options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onAsk(option.message)}
              disabled={disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {reply.suggestions.length > 0 && (
        <div
          className="assistant-chat-follow-ups"
          role="group"
          aria-label="Perguntas sugeridas"
        >
          {reply.suggestions.map((suggestion) => (
            <button
              key={suggestion.message}
              type="button"
              onClick={() => onAsk(suggestion.message, suggestion.period)}
              disabled={disabled}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}

      <div className="assistant-chat-meta">
        <span>{PERIOD_LABELS[reply.period.label]}</span>
        {reply.partial && (
          <span className="assistant-chat-badge partial">dados parciais</span>
        )}
        {reply.degraded && (
          <span className="assistant-chat-badge degraded">modo regras</span>
        )}
      </div>

      <small className="assistant-chat-disclaimer">{reply.disclaimer}</small>
    </article>
  );
}

export function AssistantChat() {
  const { token, logout } = useAuth();
  const { pathname } = useLocation();

  const [period, setPeriod] = useState<ChatPeriod>("24h");
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (log) {
      log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    }
  }, [entries, loading]);

  async function submit(value: string, nextPeriod?: ChatPeriod) {
    const question = value.trim();

    if (question === "" || loading || token === null) {
      return;
    }

    const history = buildHistory(entries);
    const requestPeriod = nextPeriod ?? period;

    if (nextPeriod !== undefined && nextPeriod !== period) {
      setPeriod(nextPeriod);
    }

    setInput("");
    setEntries((previous) => [
      ...previous,
      { id: nextId.current++, role: "user", text: question },
    ]);
    setLoading(true);

    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    abortRef.current = controller;

    try {
      const reply = await askAssistant(
        {
          message: question,
          period: requestPeriod,
          conversationId: conversationIdRef.current ?? undefined,
          context: { page: pathname, serviceName: null },
          history,
        },
        controller.signal,
        token,
      );

      conversationIdRef.current = reply.conversationId;

      setEntries((previous) => [
        ...previous,
        { id: nextId.current++, role: "assistant", reply },
      ]);
    } catch (cause) {
      // Abortar manualmente (limpar conversa ou desmontar) não gera mensagem de erro.
      if (controller.signal.aborted && !timedOut) {
        return;
      }

      if (cause instanceof ApiError && cause.status === 401) {
        logout();
        return;
      }

      const message =
        timedOut
          ? "O assistente demorou demais para responder. Tente novamente."
          : cause instanceof ApiError
            ? cause.message
            : "Não foi possível falar com o assistente agora. Tente novamente.";

      setEntries((previous) => [
        ...previous,
        { id: nextId.current++, role: "assistant", error: message },
      ]);
    } finally {
      window.clearTimeout(timeout);

      if (!controller.signal.aborted || timedOut) {
        setLoading(false);
      }

      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(input);
  }

  function handleAsk(message: string, nextPeriod?: ChatPeriod) {
    void submit(message, nextPeriod);
  }

  function clearConversation() {
    abortRef.current?.abort();
    abortRef.current = null;
    conversationIdRef.current = null;
    setEntries([]);
    setLoading(false);
  }

  return (
    <section className="assistant-chat" aria-labelledby="assistant-chat-title">
      <header className="assistant-chat-header">
        <div className="assistant-chat-heading">
          <span className="assistant-chat-eyebrow">ASSISTENTE GREENER</span>
          <h2 id="assistant-chat-title">Pergunte aos seus dados</h2>
          <p>
            Respostas geradas a partir das métricas monitoradas e da
            documentação do projeto. O modelo não acessa o banco diretamente.
          </p>
        </div>

        <div
          className="assistant-chat-period"
          role="group"
          aria-label="Período da análise"
        >
          {CHAT_PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              className={option === period ? "active" : undefined}
              onClick={() => setPeriod(option)}
              disabled={loading}
              aria-pressed={option === period}
            >
              {PERIOD_LABELS[option]}
            </button>
          ))}
        </div>
      </header>

      {entries.length === 0 && !loading ? (
        <div className="assistant-chat-empty">
          <p>Experimente uma pergunta:</p>
          <div className="assistant-chat-suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void submit(suggestion)}
                disabled={token === null}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="assistant-chat-log" ref={logRef} aria-live="polite">
          {entries.map((entry) => {
            if (entry.role === "user") {
              return (
                <div
                  key={entry.id}
                  className="assistant-chat-message assistant-chat-message-user"
                >
                  <p>{entry.text}</p>
                </div>
              );
            }

            if ("error" in entry) {
              return (
                <div
                  key={entry.id}
                  className="assistant-chat-message assistant-chat-message-error"
                >
                  <p>{entry.error}</p>
                </div>
              );
            }

            return (
              <AssistantMessage
                key={entry.id}
                reply={entry.reply}
                disabled={loading || token === null}
                onAsk={handleAsk}
              />
            );
          })}

          {loading && (
            <div className="assistant-chat-typing" role="status">
              Analisando os dados do período...
            </div>
          )}
        </div>
      )}

      <form className="assistant-chat-form" onSubmit={handleSubmit}>
        <label className="assistant-chat-sr-only" htmlFor="assistant-chat-input">
          Sua pergunta
        </label>
        <input
          id="assistant-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ex.: qual serviço gasta mais energia?"
          maxLength={500}
          disabled={loading}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || input.trim() === "" || token === null}
        >
          {loading ? "Analisando..." : "Perguntar"}
        </button>
      </form>

      <footer className="assistant-chat-footer">
        <span>
          Escopo: dados monitorados, projeto e metodologia de cálculo.
        </span>
        {entries.length > 0 && (
          <button type="button" onClick={clearConversation}>
            Limpar conversa
          </button>
        )}
      </footer>
    </section>
  );
}

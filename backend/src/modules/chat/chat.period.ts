import { AppError } from "../../shared/errors/AppError.js";
import { CHAT_PERIODS, type ChatPeriod } from "./chat.types.js";

const PERIOD_MS: Record<ChatPeriod, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const PERIOD_PHRASES: Record<ChatPeriod, string> = {
  "1h": "na última hora",
  "6h": "nas últimas 6 horas",
  "24h": "nas últimas 24 horas",
  "7d": "nos últimos 7 dias",
};

export function isChatPeriod(value: unknown): value is ChatPeriod {
  return (
    typeof value === "string" &&
    (CHAT_PERIODS as readonly string[]).includes(value)
  );
}

export function parseChatPeriod(value: unknown): ChatPeriod {
  if (value === undefined || value === null || value === "") {
    return "24h";
  }

  if (!isChatPeriod(value)) {
    throw new AppError(
      `O período deve ser um destes valores: ${CHAT_PERIODS.join(", ")}`,
      400,
      "INVALID_CHAT_PERIOD",
    );
  }

  return value;
}

export function periodBounds(period: ChatPeriod, now = new Date()) {
  return {
    start: new Date(now.getTime() - PERIOD_MS[period]),
    end: now,
  };
}

export function periodPhrase(period: ChatPeriod): string {
  return PERIOD_PHRASES[period];
}

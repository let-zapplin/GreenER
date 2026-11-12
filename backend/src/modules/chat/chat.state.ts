import type { ChatIntent, ChatPeriod } from "./chat.types.js";

export const CHAT_STATE_TTL_MS = 30 * 60 * 1000;
export const CHAT_STATE_MAX_CONVERSATIONS = 500;

export type ChatServiceReference = {
  serviceId: number;
  serviceName: string;
};

export type ChatPendingClarification = {
  kind: "SERVICE";
  question: string;
  candidates: ChatServiceReference[];
};

export type ChatConversationState = {
  conversationId: string;
  lastIntent: ChatIntent | null;
  activeService: ChatServiceReference | null;
  activePeriod: ChatPeriod | null;
  lastQuestion: string | null;
  pendingClarification: ChatPendingClarification | null;
  updatedAt: number;
};

export interface ChatStateStore {
  get(conversationId: string): ChatConversationState | null;
  set(state: ChatConversationState): void;
  delete(conversationId: string): void;
}

// Memória apenas do processo: reinícios do backend e múltiplas instâncias
// não compartilham estado. O TTL evita crescimento indefinido da memória.
export class InMemoryChatStateStore implements ChatStateStore {
  private readonly states = new Map<string, ChatConversationState>();

  constructor(
    private readonly ttlMs = CHAT_STATE_TTL_MS,
    private readonly maxConversations = CHAT_STATE_MAX_CONVERSATIONS,
  ) {}

  get(conversationId: string): ChatConversationState | null {
    const state = this.states.get(conversationId);

    if (state === undefined) {
      return null;
    }

    if (state.updatedAt + this.ttlMs <= Date.now()) {
      this.states.delete(conversationId);
      return null;
    }

    // Reinsere para manter a ordem de recência usada no descarte.
    this.states.delete(conversationId);
    this.states.set(conversationId, state);

    return state;
  }

  set(state: ChatConversationState): void {
    this.prune();

    this.states.delete(state.conversationId);
    this.states.set(state.conversationId, state);

    while (this.states.size > this.maxConversations) {
      const oldest = this.states.keys().next().value;

      if (oldest === undefined) {
        break;
      }

      this.states.delete(oldest);
    }
  }

  delete(conversationId: string): void {
    this.states.delete(conversationId);
  }

  private prune(): void {
    const now = Date.now();

    for (const [conversationId, state] of this.states) {
      if (state.updatedAt + this.ttlMs <= now) {
        this.states.delete(conversationId);
      }
    }
  }
}

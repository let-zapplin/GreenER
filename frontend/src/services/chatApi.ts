import type { ChatRequest, ChatResponse } from "../types/chat";
import { apiRequest } from "./api";

export async function askAssistant(
  payload: ChatRequest,
  signal?: AbortSignal,
  token?: string,
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>(
    "/api/chat",
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
      cache: "no-store",
    },
    token,
  );
}

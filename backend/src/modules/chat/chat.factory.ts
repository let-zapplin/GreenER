import { DashboardService } from "../dashboard/dashboard.service.js";
import { IndicadoresService } from "../indicadores/indicadores.service.js";
import { ChatService } from "./chat.service.js";
import { InMemoryChatStateStore } from "./chat.state.js";
import { OllamaClient } from "./ollama.client.js";

// O controller é criado uma única vez por processo; o store precisa durar
// o mesmo tempo para que o acompanhamento da conversa funcione entre chamadas.
const stateStore = new InMemoryChatStateStore();

export function createChatService(): ChatService {
  return new ChatService(
    new IndicadoresService(),
    new DashboardService(),
    new OllamaClient(),
    () => new Date(),
    stateStore,
  );
}

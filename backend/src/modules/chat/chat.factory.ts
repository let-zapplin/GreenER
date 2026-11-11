import { DashboardService } from "../dashboard/dashboard.service.js";
import { IndicadoresService } from "../indicadores/indicadores.service.js";
import { ChatService } from "./chat.service.js";
import { OllamaClient } from "./ollama.client.js";

export function createChatService(): ChatService {
  return new ChatService(
    new IndicadoresService(),
    new DashboardService(),
    new OllamaClient(),
  );
}

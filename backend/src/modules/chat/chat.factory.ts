import { DashboardService } from "../dashboard/dashboard.service.js";
import { IndicadoresService } from "../indicadores/indicadores.service.js";
import { ServicosService } from "../servicos/servicos.service.js";
import { ChatService } from "./chat.service.js";
import { chatStateStore } from "./chat.state.js";
import { OllamaClient } from "./ollama.client.js";

export function createChatService(): ChatService {
  return new ChatService(
    new IndicadoresService(),
    new DashboardService(),
    new OllamaClient(),
    () => new Date(),
    chatStateStore,
    new ServicosService(),
  );
}
 //este arquivo é responsável por injetar as dependências (INJEÇÃO DE DEPENDÊNCIA) 
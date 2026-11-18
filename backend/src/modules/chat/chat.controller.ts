import { type NextFunction, type Request, type Response } from "express";
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
} from "../../shared/errors/AppError.js";
import { type AuthRequest } from "../../shared/middlewares/auth.middleware.js";
import { createChatService } from "./chat.factory.js";
import { ChatService } from "./chat.service.js";
import { chatStateStore } from "./chat.state.js";

const MAX_CONCURRENT_CHAT_REQUESTS = 1;
const CHAT_BUSY_MESSAGE =
  "O assistente está processando outras perguntas. Tente novamente em instantes.";

let activeChatRequests = 0;

export class ChatController {
  private readonly service: ChatService;

  constructor(service: ChatService = createChatService()) {
    this.service = service;
  }

  async ask(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    let requestAcquired = false;

    try {
      const body: unknown = req.body;

      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new AppError(
          "Envie um objeto JSON com a pergunta",
          400,
          "INVALID_CHAT_REQUEST",
        );
      }

      const { message, period, conversationId, context, history } =
        body as Record<string, unknown>;

      const userId = (req as AuthRequest).user?.sub;
      if (typeof userId !== "string" || userId.trim() === "") {
        throw new UnauthorizedError("Token não identifica um usuário válido");
      }

      if (typeof conversationId === "string") {
        const existingConversation = chatStateStore.get(conversationId);
        if (
          existingConversation !== null &&
          existingConversation.userId !== userId
        ) {
          throw new ForbiddenError(
            "Você não tem permissão para acessar esta conversa",
          );
        }
      }

      if (activeChatRequests >= MAX_CONCURRENT_CHAT_REQUESTS) {
        throw new AppError(CHAT_BUSY_MESSAGE, 429, "CHAT_BUSY");
      }

      activeChatRequests++;
      requestAcquired = true;

      const result = await this.service.chat(
        typeof message === "string" ? message : "",
        period,
        { userId, conversationId, context, history },
      );

      res.status(200).json({
        message: "Resposta do assistente",
        ...result,
      });
    } catch (error) {
      next(error);
    } finally {
      if (requestAcquired) {
        activeChatRequests--;
      }
    }
  }
}

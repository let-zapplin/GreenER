import { type NextFunction, type Request, type Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import { createChatService } from "./chat.factory.js";
import { ChatService } from "./chat.service.js";

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

      const result = await this.service.chat(
        typeof message === "string" ? message : "",
        period,
        { conversationId, context, history },
      );

      res.status(200).json({
        message: "Resposta do assistente",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

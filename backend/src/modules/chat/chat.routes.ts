import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { ChatController } from "./chat.controller.js";

const router = Router();
const controller = new ChatController();

// O assistente exige JWT válido e não expõe nenhuma operação de escrita no banco.
router.post("/", authMiddleware, (req, res, next) =>
  controller.ask(req, res, next),
);

export default router;

import { Router } from "express";
import { MetricaController } from "./coletas.controller.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";

const router = Router();
const controller = new MetricaController();

// Rota para forçar a coleta manual (útil para testes)
router.post("/collect", authMiddleware, (req, res, next) =>
     controller.collect(req, res, next));

export default router;
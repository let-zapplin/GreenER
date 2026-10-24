import { Router } from "express";
import { MetricaController } from "./coletas.controller.js";

const router = Router();
const controller = new MetricaController();

// Rota para forçar a coleta manual (útil para testes)
router.post("/collect", (req, res, next) => controller.collect(req, res, next));

export default router;
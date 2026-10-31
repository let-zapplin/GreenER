import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { IndicadoresController } from "./indicadores.controller.js";

const router = Router();
const controller = new IndicadoresController();

router.get("/", authMiddleware, (req, res, next) =>
  controller.list(req, res, next),
);

export default router;
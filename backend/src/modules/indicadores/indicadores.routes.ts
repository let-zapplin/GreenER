import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { IndicadoresController } from "./indicadores.controller.js";

const router = Router();
const controller = new IndicadoresController();

// A consulta de indicadores exige JWT; o controller também exige start e end.
router.get("/", authMiddleware, (req, res, next) =>
  controller.list(req, res, next),
);

export default router;
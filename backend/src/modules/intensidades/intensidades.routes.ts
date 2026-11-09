import { Router } from "express";
import { IntensidadesController } from "./intensidades.controller.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";

const router = Router();
const controller = new IntensidadesController();

// Descobrir intensidades (API externa)
router.get("/discover", authMiddleware, (req, res, next) =>
  controller.discover(req, res, next),
);

// Sincronizar Intensidades (salvar no banco)
router.post("/sync", authMiddleware, (req, res, next) =>
  controller.sync(req, res, next),
);

// Listar intensidades do banco
router.get("/", authMiddleware, (req, res, next) =>
  controller.list(req, res, next),
);

export default router;

import { Router } from "express";
import { IntensidadesController } from "./intensidades.controller.js";

const router = Router();
const controller = new IntensidadesController();

// Descobrir intensidades (API externa)
router.get("/discover", (req, res, next) =>
  controller.discover(req, res, next),
);

// Sincronizar Intensidades (salvar no banco)
router.post("/sync", (req, res, next) => controller.sync(req, res, next));

// Listar intensidades do banco
router.get("/", (req, res, next) => controller.list(req, res, next));

export default router;

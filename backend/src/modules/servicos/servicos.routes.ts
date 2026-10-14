import { Router } from "express";
import { ServicosController } from "./servicos.controller.js";

const router = Router();
const controller = new ServicosController();

// US01: Descobrir serviços (API externa)
router.get("/discover", (req, res, next) =>
  controller.discover(req, res, next)
);

// US02: Sincronizar serviços (salvar no banco)
router.post("/sync", (req, res, next) =>
  controller.sync(req, res, next)
);

// US03: Listar serviços do banco
router.get("/", (req, res, next) =>
  controller.list(req, res, next)
);

export default router;
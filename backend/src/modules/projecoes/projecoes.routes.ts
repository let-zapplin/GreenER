import { Router } from "express";

import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { ProjecoesController } from "./projecoes.controller.js";

const router = Router();

const controller =
  new ProjecoesController();

router.get(
  "/regioes",
  authMiddleware,
  (req, res, next) =>
    controller.listRegions(
      req,
      res,
      next,
    ),
);

router.post(
  "/localizacao",
  authMiddleware,
  (req, res, next) =>
    controller.projectLocation(
      req,
      res,
      next,
    ),
);

export default router;
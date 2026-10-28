import { Router } from "express";
import { ColetasController } from "./coletas.controller.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { adminMiddleware } from "../../shared/middlewares/admin.middleware.js";

const router = Router();
const controller = new ColetasController();

router.post(
  "/collect",
  authMiddleware,
  adminMiddleware,
  (req, res, next) => controller.collect(req, res, next),
);

router.get<{ serviceId: string }>(
  "/historico/:serviceId",
  authMiddleware,
  (req, res, next) => controller.history(req, res, next),
);

export default router;
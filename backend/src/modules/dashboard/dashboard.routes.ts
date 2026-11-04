import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { DashboardController } from "./dashboard.controller.js";

const router = Router();
const controller = new DashboardController();

// O middleware exige JWT válido antes de entregar a requisição ao controller.
router.get("/", authMiddleware, (req, res, next) =>
  controller.getSummary(req, res, next),
);

export default router;

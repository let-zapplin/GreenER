import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { DashboardController } from "./dashboard.controller.js";

const router = Router();
const controller = new DashboardController();

router.get("/", authMiddleware, (req, res, next) =>
  controller.getSummary(req, res, next),
);

export default router;

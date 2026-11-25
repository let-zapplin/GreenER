import { Router } from "express";

import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";

import { RelatoriosController } from "./relatorios.controller.js";

type ReportsController = Pick<
  RelatoriosController,
  "individualAnalysis"
>;

export function createRelatoriosRouter(
  controller: ReportsController =
    new RelatoriosController(),
) {
  const router = Router();

  router.get(
    "/analise-individual/:serviceId",
    authMiddleware,
    (req, res, next) =>
      controller.individualAnalysis(
        req,
        res,
        next,
      ),
  );

  return router;
}

export default createRelatoriosRouter();
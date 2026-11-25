import { Router } from "express";

import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";

import {
  RelatoriosController,
} from "./relatorios.controller.js";

type ReportsController = Pick<
  RelatoriosController,
  | "individualAnalysis"
  | "comparisonAnalysis"
>;

export function createRelatoriosRouter(
  controller:
    ReportsController =
      new RelatoriosController(),
) {
  const router =
    Router();

  /*
   * GET /api/relatorios/analise-individual/:serviceId
   *
   * Exemplo:
   * ?start=...
   * &end=...
   */
  router.get(
    "/analise-individual/:serviceId",

    authMiddleware,

    (
      req,
      res,
      next,
    ) =>
      controller
        .individualAnalysis(
          req,
          res,
          next,
        ),
  );

  /*
   * GET /api/relatorios/comparacao
   *
   * Exemplo:
   * ?serviceIds=1,2,3
   * &metric=energy
   * &start=...
   * &end=...
   */
  router.get(
    "/comparacao",

    authMiddleware,

    (
      req,
      res,
      next,
    ) =>
      controller
        .comparisonAnalysis(
          req,
          res,
          next,
        ),
  );

  return router;
}

export default createRelatoriosRouter();

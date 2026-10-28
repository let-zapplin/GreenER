import { type Request, type Response, type NextFunction } from "express";
import { ColetasService } from "./coletas.service.js";

export class ColetasController {
  private readonly service = new ColetasService();

  async collect(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await this.service.collectAllMetrics();

      let message = "Coleta de métricas finalizada";

      if (summary.skipped) {
        message = "Coleta anterior ainda em execução; nenhuma nova coleta iniciada";
      } else if (summary.errorCount > 0 || summary.unavailableCount > 0) {
        message = "Coleta de métricas finalizada com falhas parciais";
      }

      res.status(200).json({
        message,
        ...summary,
      });
    } catch (error) {
      // Delega qualquer erro inesperado para o errorMiddleware
      next(error);
    }
  }
}
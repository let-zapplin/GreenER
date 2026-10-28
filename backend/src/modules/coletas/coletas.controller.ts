import { type Request, type Response, type NextFunction } from "express";
import { ColetasService } from "./coletas.service.js";

export class ColetasController {
  private readonly service = new ColetasService();

  async collect(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await this.service.collectAllMetrics();
      res.status(200).json({
        message:
          summary.errorCount > 0
            ? "Coleta de métricas finalizada com falhas parciais"
            : "Coleta de métricas finalizada",
        ...summary,
      });
    } catch (error) {
      // Delega qualquer erro inesperado para o errorMiddleware
      next(error);
    }
  }
}
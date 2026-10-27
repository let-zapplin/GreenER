import { type Request, type Response, type NextFunction } from "express";
import { MetricaService } from "./coletas.service.js";

export class MetricaController {
  private service = new MetricaService();

  async collect(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await this.service.collectAllMetrics();

      res.status(200).json({
        message: summary.skipped
          ? "Coleta anterior ainda em execução; nenhuma nova coleta iniciada"
          : "Coleta de métricas finalizada",
        ...summary,
      });
    } catch (error) {
      // Delega qualquer erro inesperado para o errorMiddleware
      next(error);
    }
  }
}
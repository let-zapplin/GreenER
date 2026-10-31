import { type NextFunction, type Request, type Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import { IndicadoresService } from "./indicadores.service.js";

function readQueryDate(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(
      `Informe o parâmetro ${name} como uma única data ISO`,
      400,
      "INVALID_INDICATOR_PERIOD",
    );
  }

  return value;
}

export class IndicadoresController {
  private readonly service: IndicadoresService;

  constructor() {
    this.service = new IndicadoresService();
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const start = readQueryDate(req.query.start, "start");
      const end = readQueryDate(req.query.end, "end");
      const result = await this.service.getIndicators(start, end);

      res.status(200).json({
        message: "Indicadores calculados",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}
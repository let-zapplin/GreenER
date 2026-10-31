import { type NextFunction, type Request, type Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import { DashboardService } from "./dashboard.service.js";

function readOptionalQueryDate(
  value: unknown,
  name: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(
      `O parâmetro ${name} deve ser uma única data ISO`,
      400,
      "INVALID_DASHBOARD_PERIOD",
    );
  }

  return value;
}

export class DashboardController {
  private readonly service: DashboardService;

  constructor() {
    this.service = new DashboardService();
  }

  async getSummary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const start = readOptionalQueryDate(req.query.start, "start");
      const end = readOptionalQueryDate(req.query.end, "end");
      const summary = await this.service.getSummary(start, end);

      res.status(200).json({
        message: "Dados consolidados do dashboard",
        ...summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

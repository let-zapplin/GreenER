import {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { AppError } from "../../shared/errors/AppError.js";
import { ProjecoesService } from "./projecoes.service.js";

interface LocationProjectionBody {
  serviceId?: unknown;
  start?: unknown;
  end?: unknown;
  regionCodes?: unknown;
}

function readRequiredString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new AppError(
      `Informe o campo ${field}`,
      400,
      "INVALID_PROJECTION_REQUEST",
    );
  }

  return value;
}

export class ProjecoesController {
  private readonly service: ProjecoesService;

  constructor() {
    this.service = new ProjecoesService();
  }

  async projectLocation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body =
        req.body as LocationProjectionBody;

      const serviceId = Number(
        body.serviceId,
      );

      const start = readRequiredString(
        body.start,
        "start",
      );

      const end = readRequiredString(
        body.end,
        "end",
      );

      if (!Array.isArray(body.regionCodes)) {
        throw new AppError(
          "Informe regionCodes como uma lista de regiões",
          400,
          "INVALID_PROJECTION_REGIONS",
        );
      }

      const result =
        await this.service.projectLocation(
          serviceId,
          start,
          end,
          body.regionCodes,
        );

      res.status(200).json({
        message:
          "Projeção ambiental calculada",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listRegions(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const regions =
      await this.service.listAvailableRegions();

    res.status(200).json({
      message:
        `${regions.length} regiões disponíveis para projeção`,

      regions,
    });
  } catch (error) {
    next(error);
  }
}
}
import {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { AppError } from "../../shared/errors/AppError.js";
import { ProjecoesService } from "./projecoes.service.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  );
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
      const body: unknown = req.body;

      if (!isRecord(body)) {
        throw new AppError(
          "O corpo da requisição deve ser um objeto JSON",
          400,
          "INVALID_PROJECTION_REQUEST",
        );
      }

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

      if (!isStringArray(body.regionCodes)) {
        throw new AppError(
          "Informe regionCodes como uma lista de códigos de região",
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

  async redistributeServices(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body: unknown = req.body;

      if (!isRecord(body)) {
        throw new AppError(
          "O corpo da requisição deve ser um objeto JSON",
          400,
          "INVALID_REDISTRIBUTION_REQUEST",
        );
      }

      const start = readRequiredString(body.start, "start");
      const end = readRequiredString(body.end, "end");

      if (typeof body.requireServicePerRegion !== "boolean") {
        throw new AppError(
          "Informe requireServicePerRegion como true ou false",
          400,
          "INVALID_REDISTRIBUTION_CONSTRAINT",
        );
      }

      const result = await this.service.redistributeServices(
        start,
        end,
        body.requireServicePerRegion,
      );

      res.status(200).json({
        message: "Redistribuição de serviços calculada",
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
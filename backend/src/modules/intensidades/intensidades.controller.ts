import { type Request, type Response, type NextFunction } from "express";
import { IntensidadesService } from "./intensidades.service.js";

export class IntensidadesController {
  private readonly service: IntensidadesService;

  constructor() {
    this.service = new IntensidadesService();
  }

  // GET /api/intensidades/discover
  async discover(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const intensities = await this.service.discoverIntensities();
      res.status(200).json({
        message: `${intensities.length} intensidades encontradas`,
        intensities,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/intensidades/sync
  async sync(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.saveIntensity();
      res.status(200).json({
        message: "Intensidades sincronizadas com sucesso",
        snapshotsInserted: result.inserted,
      });
    } catch (error) {
      next(error);
    }
  }
  // GET /api/intensidades
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const intensities = await this.service.listAll();
      res.status(200).json({
        message: `${intensities.length} intensidades encontradas`,
        intensities,
      });
    } catch (error) {
      next(error);
    }
  }
}

import { type Request, type Response, type NextFunction } from "express";
import { IntensidadesService } from "./intensidades.service.js";

export class IntensidadesController {
  private readonly service: IntensidadesService;

  constructor() {
    this.service = new IntensidadesService();
  }

  // ========================================================
  // GET /api/servicos/discover (US01)
  // ========================================================
  async discover(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const intensities = await this.service.discoverIntensities();
      res.status(200).json({
        message: `${intensities.length} serviços encontrados`,
        intensities,
      });
    } catch (error) {
      next(error);
    }
  }

  // ========================================================
  // POST /api/servicos/sync (US02)
  // ========================================================
  async sync(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.saveIntensity();
      res.status(200).json({
        message: "Intensidades sincronizadas com sucesso",
        created: result.created,
        updated: result.updated,
      });
    } catch (error) {
      next(error);
    }
  }
  // ========================================================
  // GET /api/servicos
  // Listar serviços armazenados no banco
  // ========================================================
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const intensidades = await this.service.listAll();
      res.status(200).json({
        message: `${intensidades.length} serviços encontrados`,
        intensidades,
      });
    } catch (error) {
      next(error);
    }
  }
}

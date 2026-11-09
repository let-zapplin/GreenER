import { type Request, type Response, type NextFunction } from "express";
import { ServicosService } from "./servicos.service.js";

export class ServicosController {
  private readonly service: ServicosService;

  constructor() {
    this.service = new ServicosService();
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
      const services = await this.service.discoverServices();
      res.status(200).json({
        message: `${services.length} serviços encontrados`,
        services,
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
      const result = await this.service.saveServices();
      res.status(200).json({
        message: "Serviços sincronizados com sucesso",
        created: result.created,
        updated: result.updated,
        removed: result.removed,
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
      const services = await this.service.listAll();
      res.status(200).json({
        message: `${services.length} serviços encontrados`,
        services,
      });
    } catch (error) {
      next(error);
    }
  }
}

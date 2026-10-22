import { type Request, type Response, type NextFunction } from "express";
import { AuthService } from "./auth.service.js";

export class AuthController {
  private service = new AuthService();

  // Adicionamos o 'next' e removemos o try/catch manual
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;
      const result = await this.service.register(name, email, password);
      return res.status(201).json(result);
    } catch (error) {
      next(error); // Envia para o errorMiddleware global
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await this.service.login(email, password);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

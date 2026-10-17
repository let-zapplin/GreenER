import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";

export class AuthController {
  private service = new AuthService();

  register = async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      const result = await this.service.register(name, email, password);
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await this.service.login(email, password);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }
  };
}

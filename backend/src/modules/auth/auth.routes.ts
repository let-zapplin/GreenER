import { Router, type Request, type Response } from "express";
import { AuthController } from "./auth.controller.js";
import {
  authMiddleware,
  type AuthRequest,
} from "../../shared/middlewares/auth.middleware.js";

const router = Router();
const controller = new AuthController();

router.post("/register", controller.register);
router.post("/login", controller.login);

// Rota protegida para provar que o middleware funciona!
router.get("/me", authMiddleware, (req: Request, res: Response) => {
  // Fazemos o casting para AuthRequest, que sabe que existe o 'user'
  const authReq = req as AuthRequest;

  res.json({
    message: "Rota protegida acessada com sucesso!",
    user: authReq.user,
  });
});

export default router;

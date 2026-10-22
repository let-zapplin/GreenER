import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util.js";
import { UnauthorizedError } from "../errors/AppError.js";

// Tipagem para o que vem do JWT
interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

// Estendemos o Request do Express para guardar o usuário
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Usa o seu erro customizado (401) em vez de jogar um erro genérico
    throw new UnauthorizedError("Token de autenticação não fornecido");
  }

  const [, token] = authHeader.split(" ");

  try {
    // O TypeScript precisa saber o que o verifyToken retorna
    const decoded = verifyToken(token) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError("Token inválido ou expirado");
  }
}
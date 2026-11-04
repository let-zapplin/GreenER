import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util.js";
import { UnauthorizedError } from "../errors/AppError.js";

// Campos do payload usados após a verificação do token.
interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

// Disponibiliza o payload verificado para middlewares e handlers seguintes.
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // O contrato de autenticação exige Authorization: Bearer <token>.
    throw new UnauthorizedError("Token de autenticação não fornecido");
  }

  const [, token] = authHeader.split(" ");

  try {
    // verifyToken valida assinatura e expiração; existência do usuário e perfil não são verificados aqui.
    const decoded = verifyToken(token) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    // UnauthorizedError é convertido pelo middleware global em uma resposta 401 padronizada.
    throw new UnauthorizedError("Token inválido ou expirado");
  }
}
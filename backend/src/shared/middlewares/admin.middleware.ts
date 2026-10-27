import { type Response, type NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import { UserRepository } from "../../modules/auth/auth.repository.js";
import type { AuthRequest } from "./auth.middleware.js";

const userRepository = new UserRepository();

export async function adminMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const subject = req.user?.sub;

  if (
    typeof subject !== "string" ||
    !/^[1-9]\d*$/.test(subject) ||
    !Number.isSafeInteger(Number(subject))
  ) {
    next(new UnauthorizedError("Token não identifica um usuário válido"));
    return;
  }

  try {
    const adminStatus = await userRepository.findAdminStatus(Number(subject));

    if (adminStatus === null) {
      next(new UnauthorizedError("Usuário do token não encontrado"));
      return;
    }

    if (!adminStatus) {
      next(new ForbiddenError("Apenas administradores podem iniciar coletas"));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

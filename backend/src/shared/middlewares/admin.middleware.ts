import { type Response, type NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import { UserRepository } from "../../modules/auth/auth.repository.js";
import type { AuthRequest } from "./auth.middleware.js";

const userRepository = new UserRepository();

// Deve executar depois de authMiddleware, que valida o JWT e popula req.user.
export async function adminMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const subject = req.user?.sub;

  // Exige representação decimal de inteiro positivo; Number.isSafeInteger evita IDs
  // que não possam ser representados com precisão antes da conversão.
  if (
    typeof subject !== "string" ||
    !/^[1-9]\d*$/.test(subject) ||
    !Number.isSafeInteger(Number(subject))
  ) {
    next(new UnauthorizedError("Token não identifica um usuário válido"));
    return;
  }

  try {
    // Consulta a permissão atual no banco a cada chamada; o JWT não é fonte de autorização administrativa.
    const adminStatus = await userRepository.findAdminStatus(Number(subject));

    if (adminStatus === null) {
      // 401 indica que o token não corresponde mais a um usuário existente.
      next(new UnauthorizedError("Usuário do token não encontrado"));
      return;
    }

    if (!adminStatus) {
      // 403 indica usuário existente e autenticado, mas sem privilégio administrativo.
      next(new ForbiddenError("Apenas administradores podem iniciar coletas"));
      return;
    }

    next();
  } catch (error) {
    // Encaminha falhas assíncronas do repository ao middleware global de erros.
    next(error);
  }
}

import { type Request, type Response, type NextFunction } from "express";
import { AppError } from "../errors/AppError.js";

// ============================================================
// MIDDLEWARE GLOBAL DE ERRO
// Captura TODOS os erros da aplicação
// ⚠️ SEMPRE deve ser o ÚLTIMO middleware no app.ts
// ============================================================
export function errorMiddleware(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Erro customizado (nosso)
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  // Erro inesperado (bug, falha de conexão, etc.)
  console.error("❌ Erro inesperado:", error);
  res.status(500).json({
    error: "Erro interno do servidor",
    code: "INTERNAL_ERROR",
  });
}

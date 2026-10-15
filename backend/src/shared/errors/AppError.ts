// ============================================================
// CLASSE BASE: AppError
// Padroniza TODOS os erros da aplicação
// ============================================================
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ============================================================
// ERROS PRÉ-DEFINIDOS
// ============================================================

// Erro 502: API externa falhou
export class ExternalApiError extends AppError {
  constructor(message = "Erro na API externa") {
    super(message, 502, "EXTERNAL_API_ERROR");
  }
}

// Erro 404: Recurso não encontrado
export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

// Erro 401: Dados inexistentes ou incorretos no login
export class UnauthorizedError extends AppError {
  constructor(message = "Credenciais inválidas") {
    super(message, 401, "UNAUTHORIZED")
  }
}


import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";

// Testa autorização diretamente, com consulta de permissão simulada.
// req.user representa um payload que já teria sido validado pelo authMiddleware.
const { findAdminStatusMock } = vi.hoisted(() => ({
  findAdminStatusMock: vi.fn(),
}));

vi.mock("../../modules/auth/auth.repository.js", () => ({
  UserRepository: class {
    findAdminStatus = findAdminStatusMock;
  },
}));

import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import { adminMiddleware } from "./admin.middleware.js";

describe("adminMiddleware", () => {
  beforeEach(() => {
    // Limpa chamadas para verificar a consulta e o encaminhamento em cada cenário.
    vi.clearAllMocks();
  });

  // Simula permissão true e confirma next() sem erro, permitindo continuar o fluxo.
  it("permite a operação quando o usuário é administrador no banco", async () => {
    findAdminStatusMock.mockResolvedValue(true);
    const next = vi.fn((error?: unknown) => undefined);

    await adminMiddleware(
      { user: { sub: "12", iat: 1, exp: 2 } } as AuthRequest,
      {} as Response,
      next,
    );

    expect(findAdminStatusMock).toHaveBeenCalledWith(12);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  // Simula usuário existente sem privilégio e espera ForbiddenError passado a next.
  it("nega acesso a usuário autenticado sem papel de administrador", async () => {
    findAdminStatusMock.mockResolvedValue(false);
    const next = vi.fn((error?: unknown) => undefined);

    await adminMiddleware(
      { user: { sub: "12", iat: 1, exp: 2 } } as AuthRequest,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  // sub inválido deve gerar UnauthorizedError sem sequer consultar a permissão.
  it("rejeita token sem identificador de usuário válido", async () => {
    const next = vi.fn((error?: unknown) => undefined);

    await adminMiddleware(
      { user: { sub: "not-an-id", iat: 1, exp: 2 } } as AuthRequest,
      {} as Response,
      next,
    );

    expect(findAdminStatusMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  // null representa usuário não encontrado na consulta simulada, mesmo com um sub válido.
  it("rejeita usuário removido após a emissão do token", async () => {
    findAdminStatusMock.mockResolvedValue(null);
    const next = vi.fn((error?: unknown) => undefined);

    await adminMiddleware(
      { user: { sub: "12", iat: 1, exp: 2 } } as AuthRequest,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  // A falha de consulta é simulada e deve ser repassada a next, sem ser convertida em 403.
  it("encaminha erros de banco ao middleware global", async () => {
    const databaseError = new Error("database unavailable");
    findAdminStatusMock.mockRejectedValue(databaseError);
    const next = vi.fn((error?: unknown) => undefined);

    await adminMiddleware(
      { user: { sub: "12", iat: 1, exp: 2 } } as AuthRequest,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(databaseError);
  });
});

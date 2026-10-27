import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";

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
    vi.clearAllMocks();
  });

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

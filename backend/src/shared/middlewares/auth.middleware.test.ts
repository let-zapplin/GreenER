import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware, type AuthRequest } from "./auth.middleware.js";
import { createToken } from "../utils/jwt.util.js";
import { UnauthorizedError } from "../errors/AppError.js";

const TEST_SECRET = "greener-auth-middleware-exclusive-test-secret";
const NOW = new Date("2026-10-30T12:00:00.000Z");

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
  vi.stubEnv("JWT_EXPIRES_IN", "15m");
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function setup(authorization?: string) {
  const req = {
    headers: authorization === undefined ? {} : { authorization },
  } as AuthRequest;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}

function expectUnauthorized(authorization: string | undefined, message: string) {
  const { req, res, next } = setup(authorization);
  const invoke = () => authMiddleware(req, res, next);

  expect(invoke).toThrow(UnauthorizedError);
  expect(invoke).toThrow(expect.objectContaining({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message,
  }));
  expect(next).not.toHaveBeenCalled();
  expect(req.user).toBeUndefined();
}

describe("authMiddleware com JWT real", () => {
  it("aceita token válido, disponibiliza req.user e continua a requisição", () => {
    const token = createToken({ sub: "42" });
    const { req, res, next } = setup(`Bearer ${token}`);
    const issuedAt = NOW.getTime() / 1000;

    authMiddleware(req, res, next);

    expect(req.user).toMatchObject({
      sub: "42",
      iat: issuedAt,
      exp: issuedAt + 900,
    });
    expect(next).toHaveBeenCalledExactlyOnceWith();
  });

  it("rejeita requisição sem Authorization", () => {
    expectUnauthorized(undefined, "Token de autenticação não fornecido");
  });

  it("rejeita Authorization sem o esquema Bearer", () => {
    expectUnauthorized("Basic credenciais", "Token de autenticação não fornecido");
  });

  it("rejeita Bearer sem token", () => {
    expectUnauthorized("Bearer ", "Token inválido ou expirado");
  });

  it("rejeita token malformado", () => {
    expectUnauthorized("Bearer token-invalido", "Token inválido ou expirado");
  });

  it("rejeita token expirado de verdade", () => {
    const token = createToken({ sub: "42" });
    vi.setSystemTime(NOW.getTime() + 900_000);

    expectUnauthorized(`Bearer ${token}`, "Token inválido ou expirado");
  });

  it("rejeita token assinado com outro segredo", () => {
    const token = jwt.sign({ sub: "42" }, "outro-segredo-de-teste", {
      expiresIn: 900,
    });

    expectUnauthorized(`Bearer ${token}`, "Token inválido ou expirado");
  });
});

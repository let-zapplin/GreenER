import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware, type AuthRequest } from "./auth.middleware.js";
import { createToken } from "../utils/jwt.util.js";
import { UnauthorizedError } from "../errors/AppError.js";
// Testes unitários do middleware de autenticação
const TEST_SECRET = "greener-auth-middleware-exclusive-test-secret";
const NOW = new Date("2026-10-30T12:00:00.000Z");
// Configura o ambiente de teste para usar JWT real, com tempo controlado
beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
  vi.stubEnv("JWT_EXPIRES_IN", "15m");
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
// Restaura os temporizadores reais e as variáveis de ambiente alteradas.
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
// Função auxiliar para criar objetos req, res e next simulados
function setup(authorization?: string) {
  const req = {
    headers: authorization === undefined ? {} : { authorization },
  } as AuthRequest;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}
// Confirma UnauthorizedError com statusCode 401, sem chamar next nem definir req.user.
function expectUnauthorized(
  authorization: string | undefined,
  message: string,
) {
  const { req, res, next } = setup(authorization);
  const invoke = () => authMiddleware(req, res, next);

  expect(invoke).toThrow(UnauthorizedError);
  expect(invoke).toThrow(
    expect.objectContaining({
      statusCode: 401,
      code: "UNAUTHORIZED",
      message,
    }),
  );
  expect(next).not.toHaveBeenCalled();
  expect(req.user).toBeUndefined();
}
// Testa diretamente o middleware, com validação real de JWT e objetos Express simulados.
describe("authMiddleware com JWT real", () => {
  it("aceita token válido, disponibiliza req.user e continua a requisição", () => {
    const token = createToken({ sub: "42" });
    const { req, res, next } = setup(`Bearer ${token}`);
    // JWT usa segundos: iat é o instante de emissão e exp deve ficar 900 segundos depois.
    const issuedAt = NOW.getTime() / 1000;

    authMiddleware(req, res, next);

    // Confere o payload disponibilizado ao próximo handler; esse teste não consulta usuários no banco.
    expect(req.user).toMatchObject({
      sub: "42",
      iat: issuedAt,
      exp: issuedAt + 900,
    });
    expect(next).toHaveBeenCalledExactlyOnceWith();
  });
  // Confirma a rejeição de uma requisição sem o cabeçalho Authorization.
  it("rejeita requisição sem Authorization", () => {
    expectUnauthorized(undefined, "Token de autenticação não fornecido");
  });
  // Confirma que o esquema Basic é rejeitado, pois a autenticação exige Bearer.
  it("rejeita Authorization sem o esquema Bearer", () => {
    expectUnauthorized(
      "Basic credenciais",
      "Token de autenticação não fornecido",
    );
  });
  // Confirma a rejeição do cabeçalho Bearer sem um token.
  it("rejeita Bearer sem token", () => {
    expectUnauthorized("Bearer ", "Token inválido ou expirado");
  });
  // Confirma a rejeição de um texto que não possui formato válido de JWT.
  it("rejeita token malformado", () => {
    expectUnauthorized("Bearer token-invalido", "Token inválido ou expirado");
  });
  // Avança o relógio em 15 minutos e confirma a rejeição do JWT expirado.
  it("rejeita token expirado de verdade", () => {
    const token = createToken({ sub: "42" });
    vi.setSystemTime(NOW.getTime() + 900_000);

    expectUnauthorized(`Bearer ${token}`, "Token inválido ou expirado");
  });
  // Confirma que um JWT assinado com outro segredo é rejeitado.
  it("rejeita token assinado com outro segredo", () => {
    const token = jwt.sign({ sub: "42" }, "outro-segredo-de-teste", {
      expiresIn: 900,
    });

    expectUnauthorized(`Bearer ${token}`, "Token inválido ou expirado");
  });
});

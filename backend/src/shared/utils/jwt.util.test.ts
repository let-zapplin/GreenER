import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { createToken, verifyToken } from "./jwt.util.js";

const TEST_SECRET = "greener-jwt-utils-exclusive-test-secret";
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

describe("JWT real: createToken e verifyToken", () => {
  it("emite token assinado com o segredo de teste e a expiração configurada", () => {
    const token = createToken({ sub: "42" });
    // Validação independente da função verifyToken do projeto.
    const payload = jwt.verify(token, TEST_SECRET) as jwt.JwtPayload;
    const issuedAt = NOW.getTime() / 1000;

    expect(payload).toMatchObject({
      sub: "42",
      iat: issuedAt,
      exp: issuedAt + 900,
    });
    expect(() => jwt.verify(token, "outro-segredo-de-teste")).toThrow(
      jwt.JsonWebTokenError,
    );
  });

  it("valida token real assinado com o segredo de teste", () => {
    const token = jwt.sign({ sub: "42" }, TEST_SECRET, { expiresIn: 900 });

    expect(verifyToken(token)).toMatchObject({ sub: "42" });
  });

  it("rejeita token malformado", () => {
    expect(() => verifyToken("token-invalido")).toThrow(jwt.JsonWebTokenError);
  });

  it("rejeita token com assinatura incorreta", () => {
    const token = jwt.sign({ sub: "42" }, "outro-segredo-de-teste", {
      expiresIn: 900,
    });

    expect(() => verifyToken(token)).toThrow("invalid signature");
  });

  it("aceita antes da expiração e rejeita quando o prazo termina", () => {
    const token = createToken({ sub: "42" });

    vi.setSystemTime(NOW.getTime() + 899_000);
    expect(verifyToken(token)).toMatchObject({ sub: "42" });

    vi.setSystemTime(NOW.getTime() + 900_000);
    expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError);
  });
});

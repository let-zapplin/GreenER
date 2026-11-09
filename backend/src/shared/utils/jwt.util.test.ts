import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { createToken, verifyToken } from "./jwt.util.js";

// Usa assinatura e verificação JWT reais, com segredo de teste e relógio controlado.
const TEST_SECRET = "greener-jwt-utils-exclusive-test-secret";
const NOW = new Date("2026-10-30T12:00:00.000Z");

// Fixa o instante de emissão e a validade em 15 minutos, sem modificar o arquivo .env.
beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
  vi.stubEnv("JWT_EXPIRES_IN", "15m");
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

// Restaura temporizadores e variáveis para não interferir em outros testes.
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("JWT real: createToken e verifyToken", () => {
  // Confere sub, iat e exp diretamente com jsonwebtoken e rejeição por outro segredo.
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

  // Assina diretamente com a biblioteca para testar verifyToken sem depender de createToken.
  it("valida token real assinado com o segredo de teste", () => {
    const token = jwt.sign({ sub: "42" }, TEST_SECRET, { expiresIn: 900 });

    expect(verifyToken(token)).toMatchObject({ sub: "42" });
  });

  // Um texto que não é JWT deve gerar JsonWebTokenError.
  it("rejeita token malformado", () => {
    expect(() => verifyToken("token-invalido")).toThrow(jwt.JsonWebTokenError);
  });

  // O token tem formato válido, mas foi assinado com um segredo diferente.
  it("rejeita token com assinatura incorreta", () => {
    const token = jwt.sign({ sub: "42" }, "outro-segredo-de-teste", {
      expiresIn: 900,
    });

    expect(() => verifyToken(token)).toThrow("invalid signature");
  });

  // Aos 899 segundos o token é válido; aos 900 segundos chega ao instante de expiração.
  // O relógio é simulado, mas a regra de expiração executada pela biblioteca é real.
  it("aceita antes da expiração e rejeita quando o prazo termina", () => {
    const token = createToken({ sub: "42" });

    vi.setSystemTime(NOW.getTime() + 899_000);
    expect(verifyToken(token)).toMatchObject({ sub: "42" });

    vi.setSystemTime(NOW.getTime() + 900_000);
    expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError);
  });
});

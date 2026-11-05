import { describe, expect, it } from "vitest";
import { parseJwtExpiration } from "./jwt-expiration.js";

// Testa a conversão real da configuração em segundos, sem JWT, relógio ou banco.
describe("JWT expiration configuration", () => {
  // Cada linha gera um teste: número sem sufixo significa segundos;
  // s, m, h, d e w representam unidades, com tolerância a espaços externos e maiúsculas.
  it.each([
    ["3600", 3600],
    ["1h", 3600],
    ["15m", 900],
    ["7d", 604800],
    [" 1H ", 3600],
    ["30s", 30],
    ["1w", 604800],
  ])("converts %s to %i seconds", (value, seconds) => {
    expect(parseJwtExpiration(value)).toBe(seconds);
  });
  // undefined usa o padrão de uma hora, equivalente a 3600 segundos.
  it("uses one hour when not configured", () => {
    expect(parseJwtExpiration(undefined)).toBe(3600);
  });
  // Cada valor gera um cenário de rejeição: vazio, não positivo, formato inválido ou excesso numérico.
  it.each([
    "",
    "0",
    "0h",
    "-1",
    "invalid",
    "1.5h",
    "Infinity",
    "9999999999999999999d",
  ])("rejects invalid configuration: %s", (value) => {
    expect(() => parseJwtExpiration(value)).toThrow("JWT_EXPIRES_IN");
  });
});

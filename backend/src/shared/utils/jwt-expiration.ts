/** Numeric values are seconds; duration suffixes are explicit to avoid ambiguity. */
export function parseJwtExpiration(value = "3600"): number {
  const match = /^(\d+)(s|m|h|d|w)?$/i.exec(value.trim());
  const factors: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };
  const seconds = match
    ? Number(match[1]) * factors[(match[2] || "s").toLowerCase()]
    : NaN;
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error(
      "JWT_EXPIRES_IN deve ser um número inteiro positivo de segundos ou uma duração como 15m, 1h ou 7d",
    );
  }
  return seconds;
}

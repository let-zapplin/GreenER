import { describe, expect, it } from "vitest";
import { parseJwtExpiration } from "./jwt-expiration.js";

describe("JWT expiration configuration", () => {
  it.each([["3600", 3600], ["1h", 3600], ["15m", 900], ["7d", 604800], [" 1H ", 3600], ["30s", 30], ["1w", 604800]])("converts %s to %i seconds", (value, seconds) => {
    expect(parseJwtExpiration(value)).toBe(seconds);
  });
  it("uses one hour when not configured", () => {
    expect(parseJwtExpiration(undefined)).toBe(3600);
  });
  it.each(["", "0", "0h", "-1", "invalid", "1.5h", "Infinity", "9999999999999999999d"])("rejects invalid configuration: %s", value => {
    expect(() => parseJwtExpiration(value)).toThrow("JWT_EXPIRES_IN");
  });
});

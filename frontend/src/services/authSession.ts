import type { AuthSession, AuthUser } from "../types/auth";

export const SESSION_KEY = "greener.session";
const LEGACY_TOKEN_KEY = "greener.accessToken";

// Decoding only supplies UI metadata/expiry. The backend must verify JWT signatures.
export function tokenMetadata(token: string): { id: string; expiresAt: number } | null {
  try {
    const segments = token.split(".");
    if (segments.length !== 3 || !segments.every(Boolean)) return null;
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), character => character.charCodeAt(0)));
    const payload: unknown = JSON.parse(json);
    if (!payload || typeof payload !== "object" || !("sub" in payload) || !("exp" in payload)) return null;
    if (typeof payload.sub !== "string" || !payload.sub || typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;
    const expiresAt = payload.exp * 1000;
    return Number.isSafeInteger(expiresAt) && expiresAt > Date.now() ? { id: payload.sub, expiresAt } : null;
  } catch { return null; }
}

export function createSession(token: string, user?: AuthUser): AuthSession {
  const metadata = typeof token === "string" ? tokenMetadata(token) : null;
  if (!metadata) throw new Error("A sessão retornada pelo servidor é inválida ou expirou. Entre novamente.");
  return { token, expiresAt: metadata.expiresAt, user: { id: metadata.id, name: typeof user?.name === "string" ? user.name : undefined, email: typeof user?.email === "string" ? user.email : "" } };
}

export function clearSessionStorage() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(LEGACY_TOKEN_KEY);
  }
}

export function saveSession(session: AuthSession, remember: boolean) {
  clearSessionStorage();
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
}

export function readSession(): AuthSession | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const stored = storage.getItem(SESSION_KEY);
      if (stored) {
        const value = JSON.parse(stored);
        const session = createSession(value.token, value.user);
        return session;
      }
      const legacy = storage.getItem(LEGACY_TOKEN_KEY);
      if (legacy) {
        const session = createSession(legacy);
        storage.setItem(SESSION_KEY, JSON.stringify(session));
        storage.removeItem(LEGACY_TOKEN_KEY);
        return session;
      }
    } catch {
      storage.removeItem(SESSION_KEY);
      storage.removeItem(LEGACY_TOKEN_KEY);
    }
  }
  return null;
}

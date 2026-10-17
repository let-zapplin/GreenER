import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  clearSessionStorage,
  createSession,
  readSession,
  saveSession,
  SESSION_KEY,
  tokenMetadata,
} from "../src/services/authSession.ts";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    key: (index) => [...values.keys()][index] ?? null,
  };
}
function token(exp = Math.floor(Date.now() / 1000) + 3600) {
  return `header.${Buffer.from(JSON.stringify({ sub: "42", exp })).toString("base64url")}.signature`;
}
beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage(),
    configurable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: memoryStorage(),
    configurable: true,
  });
});

test("rejeita tokens inválidos ou expirados", () => {
  assert.equal(tokenMetadata("invalid"), null);
  assert.equal(tokenMetadata(token(Math.floor(Date.now() / 1000) - 1)), null);
  assert.throws(() => createSession("invalid"), /inválida/);
});
test("restaura a identidade e expiração a partir da sessão salva", () => {
  const session = createSession(token(), {
    id: "42",
    name: "Igor",
    email: "igor@example.com",
  });
  saveSession(session, false);
  assert.deepEqual(readSession(), session);
  assert.equal(localStorage.getItem(SESSION_KEY), null);
});
test("lembrar de mim persiste a sessão e remove credenciais antigas", () => {
  const session = createSession(token());
  sessionStorage.setItem("greener.accessToken", "old-token");
  saveSession(session, true);
  assert.ok(localStorage.getItem(SESSION_KEY));
  assert.equal(sessionStorage.getItem(SESSION_KEY), null);
  assert.equal(sessionStorage.getItem("greener.accessToken"), null);
});
test("dados corrompidos no armazenamento persistente não impedem restaurar a sessão da aba", () => {
  const session = createSession(token());
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(SESSION_KEY, "invalid-json");
  assert.deepEqual(readSession(), session);
  assert.equal(localStorage.getItem(SESSION_KEY), null);
});
test("remove uma sessão expirada em vez de restaurá-la", () => {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token: token(1) }));
  assert.equal(readSession(), null);
  assert.equal(localStorage.getItem(SESSION_KEY), null);
});
test("migra o token válido salvo pela implementação anterior", () => {
  const legacy = token();
  sessionStorage.setItem("greener.accessToken", legacy);
  assert.equal(readSession()?.token, legacy);
  assert.equal(sessionStorage.getItem("greener.accessToken"), null);
  assert.ok(sessionStorage.getItem(SESSION_KEY));
});
test("logout remove a sessão e os tokens legados dos dois armazenamentos", () => {
  for (const storage of [localStorage, sessionStorage]) {
    storage.setItem(SESSION_KEY, "session");
    storage.setItem("greener.accessToken", "legacy");
  }
  clearSessionStorage();
  for (const storage of [localStorage, sessionStorage]) {
    assert.equal(storage.length, 0);
  }
});

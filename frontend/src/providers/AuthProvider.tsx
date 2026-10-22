import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AuthContext } from "../contexts/AuthContext";
import { loginRequest, registerRequest } from "../services/authApi";
import {
  clearSessionStorage,
  createSession,
  readSession,
  saveSession,
  SESSION_KEY,
} from "../services/authSession";
import { clearMonitoringSnapshot } from "../services/monitoringState";
import type { LoginCredentials, RegisterCredentials } from "../types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession);
  const generation = useRef(0);
  const logout = useCallback(() => {
    generation.current++;
    clearSessionStorage();
    clearMonitoringSnapshot();
    setSession(null);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials, remember = false) => {
      const attempt = ++generation.current;
      const response = await loginRequest(credentials);
      if (attempt !== generation.current)
        throw new Error("A tentativa de login foi cancelada. Tente novamente.");
      const next = createSession(
        response.token,
        response.user ?? { id: "", email: credentials.email },
      );
      saveSession(next, remember);
      clearMonitoringSnapshot();
      setSession(next);
    },
    [],
  );

  const register = useCallback(async (credentials: RegisterCredentials) => {
    await registerRequest(credentials);
  }, []);

  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout>;
    function checkExpiration() {
      clearTimeout(timer);
      const remaining = session!.expiresAt - Date.now();
      if (remaining <= 0) logout();
      else
        timer = setTimeout(checkExpiration, Math.min(remaining, 2_147_483_647));
    }
    checkExpiration();
    document.addEventListener("visibilitychange", checkExpiration);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", checkExpiration);
    };
  }, [session, logout]);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (
        event.storageArea !== localStorage ||
        (event.key !== null &&
          event.key !== SESSION_KEY &&
          event.key !== "greener.accessToken")
      )
        return;
      generation.current++;
      clearMonitoringSnapshot();
      setSession(readSession());
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

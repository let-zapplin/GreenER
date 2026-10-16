import { createContext } from "react";
import type { AuthSession, LoginCredentials, RegisterCredentials } from "../types/auth";

export type AuthContextValue = {
  session: AuthSession | null;
  user: AuthSession["user"] | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials, remember?: boolean) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

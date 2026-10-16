import { apiRequest } from "./api";
import type { AuthUser, LoginCredentials, RegisterCredentials } from "../types/auth";

export function loginRequest(credentials: LoginCredentials) {
  return apiRequest<{ token: string; user?: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
}

export function registerRequest(credentials: RegisterCredentials) {
  return apiRequest<{ id: number; email: string }>("/auth/register", { method: "POST", body: JSON.stringify(credentials) });
}

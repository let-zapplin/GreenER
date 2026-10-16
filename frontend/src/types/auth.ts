export type AuthUser = { id: string; name?: string; email: string };
export type AuthSession = { token: string; user: AuthUser; expiresAt: number };
export type LoginCredentials = { email: string; password: string };
export type RegisterCredentials = LoginCredentials & { name: string };

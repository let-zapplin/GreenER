const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "ApiError"; }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: options.signal ?? AbortSignal.timeout(15000) });
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new ApiError("O servidor retornou uma resposta inválida. Tente novamente.", response.status); }
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Não foi possível concluir a solicitação. Tente novamente.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

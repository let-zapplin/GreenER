import type {
  DiscoverServicesResponse,
  ListServicesResponse,
} from "../types/service";

import { apiRequest } from "./api";

export { storedServiceToService } from "./serviceMapping";

export async function discoverServices(
  signal?: AbortSignal,
  token?: string,
): Promise<DiscoverServicesResponse> {
  return apiRequest<DiscoverServicesResponse>(
    "/api/servicos/discover",
    { signal, cache: "no-store" },
    token,
  );
}

export async function listServices(
  signal?: AbortSignal,
  token?: string,
): Promise<ListServicesResponse> {
  return apiRequest<ListServicesResponse>(
    "/api/servicos",
    { signal, cache: "no-store" },
    token,
  );
}

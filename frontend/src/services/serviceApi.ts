import type {
  DiscoverServicesResponse,
  ListServicesResponse,
  StoredService,
  MonitoredService,
} from "../types/service";

import { apiRequest } from "./api";

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

export function storedServiceToService(
  storedService: StoredService,
): MonitoredService {
  return {
    id: storedService.external_id,
    name: storedService.name,

    location: {
      region_code: storedService.region_code,
      country: storedService.country,
      region: storedService.region,
      city: storedService.city,
      latitude: storedService.latitude,
      longitude: storedService.longitude,
    },

    metrics_path: "",

    status: storedService.status,
    lastConfirmedAt: storedService.last_seen_at ?? undefined,
  };
}

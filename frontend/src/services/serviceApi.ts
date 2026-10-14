import type {
  DiscoverServicesResponse,
  ListServicesResponse,
  Service,
  StoredService,
} from "../types/service";

const API_URL = import.meta.env.VITE_API_URL;

export async function discoverServices(
  signal?: AbortSignal,
): Promise<DiscoverServicesResponse> {
  const response = await fetch(`${API_URL}/api/servicos/discover`, {
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os serviços");
  }

  return response.json();
}

export async function listServices(
  signal?: AbortSignal,
): Promise<ListServicesResponse> {
  const response = await fetch(`${API_URL}/api/servicos`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Não foi possivel carregar os serviços armazenados");
  }

  return response.json();
}

export function storedServiceToService(storedService: StoredService): Service {
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
  };
}

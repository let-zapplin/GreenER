export type ServiceLocation = {
  region_code: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Service = {
  id: string;
  name: string;
  location: ServiceLocation;
  metrics_path?: string;
};

export type DiscoverServicesResponse = {
  message: string;
  services: Service[];
};

export type ServiceStatus = "active" | "new" | "unavailable" | "returned";

export type MonitoredService = Service & {
  status: ServiceStatus;
  statusExpiresAt?: number;
  lastConfirmedAt?: string;
};

export type StoredService = {
  id_service: number;
  external_id: string;
  name: string;
  region_code: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "active" | "unavailable";
  last_seen_at: string | null;
};

export type ListServicesResponse = {
  message: string;
  services: StoredService[];
};

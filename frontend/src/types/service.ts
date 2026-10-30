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

export type ServiceStatus =
  | "active"
  | "new"
  | "removed"
  | "returned"
  | "unavailable"
  | "no_metrics";

export type CollectionStatus =
  | "success"
  | "no_metrics"
  | "unavailable"
  | "error";

export type MonitoredService = Service & {
  status: ServiceStatus;
  statusExpiresAt?: number;
  lastConfirmedAt?: string;
  lastCollectionAt?: string | null;
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
  status: "active" | "removed";
  last_seen_at: string | null;
  last_collection_status: CollectionStatus | null;
  last_collection_at: string | null;
};

export type ListServicesResponse = {
  message: string;
  services: StoredService[];
};

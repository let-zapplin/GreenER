import type { MonitoredService, StoredService } from "../types/service";

export function getMonitoringStatus(
  storedService: StoredService,
): MonitoredService["status"] {
  if (storedService.status === "removed") {
    return "removed";
  }

  if (storedService.last_collection_status === "unavailable") {
    return "unavailable";
  }

  if (storedService.last_collection_status === "no_metrics") {
    return "no_metrics";
  }

  return "active";
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
    status: getMonitoringStatus(storedService),
    lastConfirmedAt: storedService.last_seen_at ?? undefined,
    lastCollectionAt: storedService.last_collection_at,
  };
}

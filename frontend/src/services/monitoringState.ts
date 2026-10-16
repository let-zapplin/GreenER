import type { MonitoredService, Service } from "../types/service";

const STATUS_HIGHLIGHT_MS = 3_000;

export type MonitoringSnapshot = {
  services: MonitoredService[];
  lastUpdated: string | null;
};

// Retains successful discoveries while navigating within this tab.
let snapshot: MonitoringSnapshot = { services: [], lastUpdated: null };

export function clearMonitoringSnapshot() {
  snapshot = { services: [], lastUpdated: null };
}

export function getMonitoringSnapshot(): MonitoringSnapshot {
  return snapshot;
}

export function reconcileServices(previous: MonitoredService[], current: Service[], hasLoaded: boolean, now = Date.now()): MonitoredService[] {
  const currentById = new Map(current.map((service) => [service.id, service]));
  const knownIds = new Set(previous.map((service) => service.id));
  const remembered = previous.map((service): MonitoredService => {
    const found = currentById.get(service.id);
    if (!found) {
      const { statusExpiresAt: _expiresAt, ...rememberedService } = service;
      return { ...rememberedService, status: "unavailable" };
    }
    if (service.status === "unavailable") {
      return { ...found, status: "returned", statusExpiresAt: now + STATUS_HIGHLIGHT_MS, lastConfirmedAt: new Date(now).toISOString() };
    }
    if ((service.status === "new" || service.status === "returned") &&
        service.statusExpiresAt !== undefined && now < service.statusExpiresAt) {
      return { ...found, status: service.status, statusExpiresAt: service.statusExpiresAt, lastConfirmedAt: new Date(now).toISOString() };
    }
    return { ...found, status: "active", lastConfirmedAt: new Date(now).toISOString() };
  });
  const discovered = [...currentById.values()]
    .filter((service) => !knownIds.has(service.id))
    .map((service): MonitoredService => hasLoaded
      ? { ...service, status: "new", statusExpiresAt: now + STATUS_HIGHLIGHT_MS, lastConfirmedAt: new Date(now).toISOString() }
      : { ...service, status: "active", lastConfirmedAt: new Date(now).toISOString() });
  return [...remembered, ...discovered];
}

export function recordDiscovery(current: Service[]): MonitoringSnapshot {
  const now = Date.now();
  snapshot = {
    services: reconcileServices(snapshot.services, current, snapshot.lastUpdated !== null, now),
    lastUpdated: new Date(now).toISOString(),
  };
  return snapshot;
}

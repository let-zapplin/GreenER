import type { MonitoredService } from "../types/service";

const STATUS_HIGHLIGHT_MS = 3_000;

export type MonitoringSnapshot = {
  services: MonitoredService[];
  lastUpdated: string | null;
};

// Retains successful discoveries while navigating within this tab.
let snapshot: MonitoringSnapshot = { services: [], lastUpdated: null };

export function getMonitoringSnapshot(): MonitoringSnapshot {
  return snapshot;
}

export function reconcileServices(
  previous: MonitoredService[],
  current: MonitoredService[],
  hasLoaded: boolean,
  now = Date.now(),
): MonitoredService[] {
  const previousById = new Map(
    previous.map((service) => [service.id, service]),
  );

  return current.map((service): MonitoredService => {
    const previousService = previousById.get(service.id);

    // O backend é a fonte oficial da indisponibilidade.
    if (service.status === "unavailable") {
      return {
        ...service,
        status: "unavailable",
      };
    }

    // Primeira vez que a página carrega:
    // não tratamos todos os serviços existentes como "novos".
    if (!hasLoaded) {
      return {
        ...service,
        status: "active",
        lastConfirmedAt: new Date(now).toISOString(),
      };
    }

    // Serviço ainda não era conhecido pelo frontend.
    if (!previousService) {
      return {
        ...service,
        status: "new",
        statusExpiresAt: now + STATUS_HIGHLIGHT_MS,
        lastConfirmedAt: new Date(now).toISOString(),
      };
    }

    // Antes estava indisponível e agora o backend diz que está ativo.
    if (previousService.status === "unavailable") {
      return {
        ...service,
        status: "returned",
        statusExpiresAt: now + STATUS_HIGHLIGHT_MS,
        lastConfirmedAt: new Date(now).toISOString(),
      };
    }

    // Mantém temporariamente o destaque de "new" ou "returned".
    if (
      (previousService.status === "new" ||
        previousService.status === "returned") &&
      previousService.statusExpiresAt !== undefined &&
      now < previousService.statusExpiresAt
    ) {
      return {
        ...service,
        status: previousService.status,
        statusExpiresAt: previousService.statusExpiresAt,
        lastConfirmedAt: new Date(now).toISOString(),
      };
    }

    // Caso normal: serviço ativo.
    return {
      ...service,
      status: "active",
      lastConfirmedAt: new Date(now).toISOString(),
    };
  });
}

export function recordDiscovery(current: MonitoredService[]): MonitoringSnapshot {
  const now = Date.now();
  snapshot = {
    services: reconcileServices(
      snapshot.services,
      current,
      snapshot.lastUpdated !== null,
      now,
    ),
    lastUpdated: new Date(now).toISOString(),
  };
  return snapshot;
}

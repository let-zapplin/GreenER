import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import {
  listServices,
  storedServiceToService,
} from "../services/serviceApi";
import {
  getMonitoringSnapshot,
  recordDiscovery,
} from "../services/monitoringState";

const MONITORING_REFRESH_INTERVAL_MS = 60_000;
const MONITORING_REQUEST_TIMEOUT_MS = 15_000;

export function useMonitoring() {
  const { token, logout } = useAuth();

  const [snapshot, setSnapshot] =
    useState(getMonitoringSnapshot);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const authToken = token;

    let disposed = false;
    let refreshTimer: number | undefined;
    let controller: AbortController | null = null;
    let keepPolling = true;

    setSnapshot(getMonitoringSnapshot());
    setLoading(true);
    setError(null);

    async function loadServices() {
      if (disposed) {
        return;
      }

      const requestController =
        new AbortController();

      controller = requestController;

      const requestTimeout =
        window.setTimeout(() => {
          requestController.abort();
        }, MONITORING_REQUEST_TIMEOUT_MS);

      try {
        const data = await listServices(
          requestController.signal,
          authToken,
        );

        if (
          disposed ||
          requestController.signal.aborted
        ) {
          return;
        }

        setSnapshot(
          recordDiscovery(
            data.services.map(
              storedServiceToService,
            ),
          ),
        );

        setError(null);
      } catch (error) {
        if (disposed) {
          return;
        }

        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          keepPolling = false;
          logout();
          return;
        }

        setError(
          requestController.signal.aborted
            ? "A consulta excedeu o tempo de espera"
            : "Erro ao carregar os serviços",
        );
      } finally {
        window.clearTimeout(requestTimeout);

        controller = null;

        if (!disposed) {
          setLoading(false);

          if (keepPolling) {
            refreshTimer =
              window.setTimeout(() => {
                void loadServices();
              }, MONITORING_REFRESH_INTERVAL_MS);
          }
        }
      }
    }

    void loadServices();

    return () => {
      disposed = true;

      if (refreshTimer !== undefined) {
        window.clearTimeout(refreshTimer);
      }

      controller?.abort();
    };
  }, [token, logout]);

  return {
    snapshot,
    loading,
    error,
  };
}
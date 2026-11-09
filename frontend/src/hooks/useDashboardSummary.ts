import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { getDashboardSummary } from "../services/dashboardApi";
import type { DashboardResponse } from "../types/dashboard";

const DASHBOARD_REFRESH_INTERVAL_MS = 60_000;
const DASHBOARD_REQUEST_TIMEOUT_MS = 15_000;

export function useDashboardSummary() {
  const { token, logout } = useAuth();

  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [lastUpdated, setLastUpdated] =
    useState<string | null>(null);

  useEffect(() => {
      if (!token) {
      setDashboard(null);
      setLoading(false);
      setError(null);
      setLastUpdated(null);
      return;
    }
      const authToken = token;

    let disposed = false;
    let refreshTimer: number | undefined;
    let controller: AbortController | null = null;
    let firstRequest = true;
    let keepPolling = true;

    async function loadDashboard() {
      if (disposed) {
        return;
      }

      const requestController =
        new AbortController();

      controller = requestController;

      const requestTimeout =
        window.setTimeout(() => {
          requestController.abort();
        }, DASHBOARD_REQUEST_TIMEOUT_MS);

      if (firstRequest) {
        setLoading(true);
      }

      try {
        const data = await getDashboardSummary(
          requestController.signal,
          authToken,
        );

        if (
          disposed ||
          requestController.signal.aborted
        ) {
          return;
        }

        setDashboard(data);
        setError(null);

        setLastUpdated(
          new Date().toISOString(),
        );
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
            ? "A atualização dos indicadores excedeu o tempo de espera."
            : error instanceof ApiError
              ? error.message
              : "Não foi possível atualizar os indicadores do ambiente.",
        );
      } finally {
        window.clearTimeout(requestTimeout);

        controller = null;

        if (!disposed) {
          setLoading(false);
          firstRequest = false;

          if (keepPolling) {
            refreshTimer =
              window.setTimeout(() => {
                void loadDashboard();
              }, DASHBOARD_REFRESH_INTERVAL_MS);
          }
        }
      }
    }

    void loadDashboard();

    return () => {
      disposed = true;

      if (refreshTimer !== undefined) {
        window.clearTimeout(refreshTimer);
      }

      controller?.abort();
    };
  }, [token, logout]);

  return {
    dashboard,
    loading,
    error,
    lastUpdated,
  };
}
import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { getServiceIndicators } from "../services/indicatorsApi";
import type { IndicatorsResponse } from "../types/indicators";

const PERIOD_MS = 24 * 60 * 60 * 1000;
const REFRESH_INTERVAL_MS = 60_000;

export function useServiceIndicators() {
  const { token, logout } = useAuth();

  const [indicators, setIndicators] =
    useState<IndicatorsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authToken = token;

    if (!authToken) {
      setIndicators(null);
      setLoading(false);
      setError(null);
      return;
    }

    let disposed = false;
    let requestInFlight = false;
    let controller: AbortController | null = null;

    async function loadIndicators(authToken: string) {
      if (disposed || requestInFlight) return;

      requestInFlight = true;

      const requestController = new AbortController();
      controller = requestController;

      const requestTimeout = setTimeout(
        () => requestController.abort(),
        15_000,
      );

      const end = new Date();
      const start = new Date(end.getTime() - PERIOD_MS);

      try {
        const data = await getServiceIndicators(
          {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          requestController.signal,
          authToken,
        );

        if (disposed) return;

        setIndicators(data);
        setError(null);
      } catch (error) {
        if (disposed) return;

        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        setError(
          requestController.signal.aborted
            ? "A consulta dos indicadores excedeu o tempo de espera."
            : error instanceof ApiError
              ? error.message
              : "Não foi possível carregar os indicadores dos serviços.",
        );
      } finally {
        clearTimeout(requestTimeout);
        requestInFlight = false;

        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadIndicators(authToken);

    const refreshTimer = setInterval(
      () => void loadIndicators(authToken),
      REFRESH_INTERVAL_MS,
    );

    return () => {
      disposed = true;
      clearInterval(refreshTimer);
      controller?.abort();
    };
  }, [token, logout]);

  return {
    indicators,
    loading,
    error,
  };
}
import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { getServiceIndicatorHistory } from "../services/indicatorsApi";
import type { ServiceIndicatorHistoryResponse } from "../types/indicators";

const PERIOD_MS = 24 * 60 * 60 * 1000;
const REFRESH_INTERVAL_MS = 60_000;

export function useServiceIndicatorHistory(
  serviceId: number | null,
) {
  const { token, logout } = useAuth();

  const [history, setHistory] =
    useState<ServiceIndicatorHistoryResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authToken = token;
    const selectedServiceId = serviceId;

    if (!authToken || selectedServiceId === null) {
      setHistory(null);
      setLoading(false);
      setError(null);
      return;
    }

    let disposed = false;
    let requestInFlight = false;
    let controller: AbortController | null = null;

    setHistory(null);
    setLoading(true);
    setError(null);

    async function loadHistory(
      authToken: string,
      selectedServiceId: number,
    ) {
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
        const data = await getServiceIndicatorHistory(
          selectedServiceId,
          {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          requestController.signal,
          authToken,
        );

        if (disposed) return;

        setHistory(data);
        setError(null);
      } catch (error) {
        if (disposed) return;

        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        setError(
          requestController.signal.aborted
            ? "A consulta do histórico excedeu o tempo de espera."
            : error instanceof ApiError
              ? error.message
              : "Não foi possível carregar o histórico ambiental.",
        );
      } finally {
        clearTimeout(requestTimeout);
        requestInFlight = false;

        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadHistory(authToken, selectedServiceId);

    const refreshTimer = setInterval(
      () => void loadHistory(authToken, selectedServiceId),
      REFRESH_INTERVAL_MS,
    );

    return () => {
      disposed = true;
      clearInterval(refreshTimer);
      controller?.abort();
    };
  }, [serviceId, token, logout]);

  return {
    history,
    loading,
    error,
  };
}
import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { getServiceIndicatorHistory } from "../services/indicatorsApi";

import type { AnalysisPeriodWindow } from "../services/analysisPeriod";
import type { ServiceIndicatorHistoryResponse } from "../types/indicators";

export function useComparisonHistories(
  serviceIds: number[],
  period: AnalysisPeriodWindow,
  enabled: boolean,
) {
  const { token, logout } = useAuth();

  const [histories, setHistories] =
    useState<ServiceIndicatorHistoryResponse[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const authToken = token;

    if (
      !authToken ||
      !enabled ||
      serviceIds.length === 0
    ) {
      setHistories([]);
      setLoading(false);
      setError(null);

      return;
    }

    let disposed = false;

    const controller = new AbortController();

    let didTimeout = false;

    setHistories([]);
    setLoading(true);
    setError(null);

    const requestTimeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, 15_000);

    async function loadHistories(
      authToken: string,
    ) {
      try {
        const requestPeriod = {
          start: period.start,
          end: period.end,
        };

        const data = await Promise.all(
          serviceIds.map((serviceId) =>
            getServiceIndicatorHistory(
              serviceId,
              requestPeriod,
              controller.signal,
              authToken,
            ),
          ),
        );

        if (disposed) return;

        setHistories(data);
        setError(null);
      } catch (error) {
        if (disposed) return;

        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          controller.abort();
          logout();
          return;
        }

        controller.abort();

        setHistories([]);

        setError(
          didTimeout
            ? "A consulta da comparação excedeu o tempo de espera."
            : error instanceof ApiError
              ? error.message
              : "Não foi possível carregar os históricos da comparação.",
        );
      } finally {
        clearTimeout(requestTimeout);

        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadHistories(authToken);

    return () => {
      disposed = true;

      clearTimeout(requestTimeout);

      controller.abort();
    };
  }, [
    serviceIds,
    period,
    enabled,
    token,
    logout,
  ]);

  return {
    histories,
    loading,
    error,
  };
}
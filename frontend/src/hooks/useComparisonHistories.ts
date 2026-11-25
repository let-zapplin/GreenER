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

  const [failedServiceIds, setFailedServiceIds] = useState<number[]>([]);

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
      setFailedServiceIds([]);

      return;
    }

    let disposed = false;

    const controller = new AbortController();

    let didTimeout = false;

    setHistories([]);
    setLoading(true);
    setError(null);
    setFailedServiceIds([]);

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

        // Cada consulta é avaliada separadamente, preservando os sucessos.
        const results = await Promise.allSettled(
          serviceIds.map(async (serviceId) => {
            try {
              return await getServiceIndicatorHistory(
                serviceId,
                requestPeriod,
                controller.signal,
                authToken,
              );
            } catch (error) {
              // Sessão expirada cancela as consultas restantes imediatamente.
              if (error instanceof ApiError && error.status === 401) {
                controller.abort();
              }
              throw error;
            }
          }),
        );

        if (disposed) return;

        if (
          results.some(
            (result) => result.status === "rejected" &&
              result.reason instanceof ApiError && result.reason.status === 401,
          )
        ) {
          logout();
          return;
        }

        const successfulHistories: ServiceIndicatorHistoryResponse[] = [];
        const failedIds: number[] = [];

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            successfulHistories.push(result.value);
          } else {
            failedIds.push(serviceIds[index]);
          }
        });

        setHistories(successfulHistories);
        setFailedServiceIds(failedIds);

        if (failedIds.length === 0) {
          setError(null);
        } else if (successfulHistories.length > 0) {
          setError(
            didTimeout
              ? "Algumas consultas excederam o tempo de espera. Exibindo apenas os históricos recebidos."
              : "Não foi possível carregar todos os serviços selecionados. Exibindo apenas os históricos recebidos.",
          );
        } else {
          setError(
            didTimeout
              ? "A consulta da comparação excedeu o tempo de espera."
              : "Não foi possível carregar os históricos da comparação.",
          );
        }
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
    failedServiceIds,
  };
}

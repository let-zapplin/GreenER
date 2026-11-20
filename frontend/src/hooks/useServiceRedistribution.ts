import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { redistributeServices } from "../services/projectionApi";

import type { AnalysisPeriodWindow } from "../services/analysisPeriod";
import type {
  ServiceRedistributionPolicy,
  ServiceRedistributionResponse,
} from "../types/projection";

export function useServiceRedistribution() {
  const { token, logout } = useAuth();
  const [result, setResult] =
    useState<ServiceRedistributionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    },
    [],
  );

  const reset = useCallback(() => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setResult(null);
    setLoading(false);
    setError(null);
  }, []);

  const run = useCallback(
    async (
      period: AnalysisPeriodWindow,
      occupancyPolicy: ServiceRedistributionPolicy,
    ) => {
      if (!token) {
        setResult(null);
        setLoading(false);
        setError("Sua sessão expirou. Faça login novamente.");
        return;
      }

      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      setResult(null);
      setLoading(true);
      setError(null);

      try {
        const response = await redistributeServices(
          period,
          occupancyPolicy,
          controller.signal,
          token,
        );

        if (activeRequest.current === controller) {
          setResult(response);
        }
      } catch (requestError) {
        if (
          controller.signal.aborted ||
          activeRequest.current !== controller
        ) {
          return;
        }

        if (
          requestError instanceof ApiError &&
          requestError.status === 401
        ) {
          logout();
          setError("Sua sessão expirou. Faça login novamente.");
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Não foi possível calcular a redistribuição.",
        );
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = null;
          setLoading(false);
        }
      }
    },
    [logout, token],
  );

  return {
    result,
    loading,
    error,
    run,
    reset,
  };
}

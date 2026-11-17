import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { projectServiceLocation } from "../services/projectionApi";

import type { AnalysisPeriodWindow } from "../services/analysisPeriod";
import type { LocationProjectionResponse } from "../types/projection";

export function useLocationProjection(
  serviceId: number | null,
  period: AnalysisPeriodWindow,
  regionCodes: string[],
  enabled: boolean,
) {
  const { token, logout } = useAuth();

  const [projection, setProjection] =
    useState<LocationProjectionResponse | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const authToken = token;

    if (
      !authToken ||
      !enabled ||
      serviceId === null ||
      regionCodes.length === 0
    ) {
      setProjection(null);
      setLoading(false);
      setError(null);

      return;
    }

    let disposed = false;

    const controller =
      new AbortController();

    let didTimeout = false;

    setProjection(null);
    setLoading(true);
    setError(null);

    const requestTimeout = setTimeout(
      () => {
        didTimeout = true;
        controller.abort();
      },
      15_000,
    );

    async function loadProjection(
      authToken: string,
      selectedServiceId: number,
    ) {
      try {
        const data =
          await projectServiceLocation(
            selectedServiceId,
            {
              start: period.start,
              end: period.end,
            },
            regionCodes,
            controller.signal,
            authToken,
          );

        if (disposed) return;

        setProjection(data);
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

        setProjection(null);

        setError(
          didTimeout
            ? "A projeção excedeu o tempo de espera."
            : error instanceof ApiError
              ? error.message
              : "Não foi possível calcular a projeção ambiental.",
        );
      } finally {
        clearTimeout(requestTimeout);

        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadProjection(
      authToken,
      serviceId,
    );

    return () => {
      disposed = true;

      clearTimeout(requestTimeout);

      controller.abort();
    };
  }, [
    serviceId,
    period,
    regionCodes,
    enabled,
    token,
    logout,
  ]);

  return {
    projection,
    loading,
    error,
  };
}
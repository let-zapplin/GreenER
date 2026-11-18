import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { getProjectionRegions } from "../services/projectionApi";

import type { ProjectionRegion } from "../types/projection";

export function useProjectionRegions(
  enabled: boolean,
) {
  const { token, logout } = useAuth();

  const [regions, setRegions] = useState<ProjectionRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const authToken = token;

    if (!authToken || !enabled) {
      setRegions([]);
      setLoading(false);
      setError(null);

      return;
    }

    let disposed = false;

    const controller =
      new AbortController();

    let didTimeout = false;

    setLoading(true);
    setError(null);

    const requestTimeout = setTimeout(
      () => {
        didTimeout = true;
        controller.abort();
      },
      15_000,
    );

    async function loadRegions(
      authToken: string,
    ) {
      try {
        const data =
          await getProjectionRegions(
            controller.signal,
            authToken,
          );

        if (disposed) return;

        setRegions(data.regions);
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

        setRegions([]);

        setError(
          didTimeout
            ? "A consulta das localidades excedeu o tempo de espera."
            : error instanceof ApiError
              ? error.message
              : "Não foi possível carregar as localidades disponíveis.",
        );
      } finally {
        clearTimeout(requestTimeout);

        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadRegions(authToken);

    return () => {
      disposed = true;

      clearTimeout(requestTimeout);

      controller.abort();
    };
  }, [
    enabled,
    token,
    logout,
  ]);

  return {
    regions,
    loading,
    error,
  };
}
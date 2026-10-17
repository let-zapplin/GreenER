import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { listServices, storedServiceToService } from "../services/serviceApi";
import {
  getMonitoringSnapshot,
  recordDiscovery,
} from "../services/monitoringState";

export function useMonitoring() {
  const { token, logout } = useAuth();
  const [snapshot, setSnapshot] = useState(getMonitoringSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let disposed = false;
    let requestInFlight = false;
    let controller: AbortController | null = null;
    setSnapshot(getMonitoringSnapshot());
    setLoading(true);
    setError(null);
    async function loadServices() {
      if (disposed || requestInFlight) return;
      requestInFlight = true;
      const requestController = new AbortController();
      controller = requestController;
      const requestTimeout = setTimeout(() => requestController.abort(), 15000);
      try {
        const data = await listServices(requestController.signal, token!);
        if (disposed) return;
        setSnapshot(recordDiscovery(data.services.map(storedServiceToService)));
        setError(null);
      } catch (error) {
        if (disposed) return;
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }
        setError(
          requestController.signal.aborted
            ? "A consulta excedeu o tempo de espera"
            : "Erro ao carregar os serviços",
        );
      } finally {
        clearTimeout(requestTimeout);
        requestInFlight = false;
        if (!disposed) setLoading(false);
      }
    }
    void loadServices();
    const refreshTimer = setInterval(() => void loadServices(), 1000);
    return () => {
      disposed = true;
      clearInterval(refreshTimer);
      controller?.abort();
    };
  }, [token, logout]);

  return { snapshot, loading, error };
}

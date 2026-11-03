import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { ApiError } from "../services/api";
import { getDashboardSummary } from "../services/dashboardApi";
import type { DashboardResponse } from "../types/dashboard";

export function useDashboardSummary() {
    const {token, logout} = useAuth();

    const[dashboard, setDashboard] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(()=> {
        const authToken = token;
        
        if (!authToken) {
            setDashboard(null);
            setLoading(false);
            return;
        }

    const controller = new AbortController();
    async function loadDashboard(authToken: string) {
        try {
            setLoading (true);
            setError (null);

        const data = await getDashboardSummary(
            controller.signal,
            authToken,
        );

        if (controller.signal.aborted) return;

        setDashboard(data);
        } catch (error) {
          if (controller.signal.aborted) return;

          if (error instanceof ApiError && error.status === 401) {
            logout();
            return;
          }

          setDashboard(null);

          setError(
            error instanceof ApiError
            ? error.message
            : "Não foi possível carregar os indicadores do ambiente.",
          );
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }
    
    void loadDashboard(authToken);

    return () => {
        controller.abort();
    };
    }, [token, logout]);

    return {
        dashboard,
        loading,
        error,
    };
}
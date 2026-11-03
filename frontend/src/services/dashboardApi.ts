import type { DashboardResponse } from "../types/dashboard";
import { apiRequest } from "./api";

export async function getDashboardSummary (
    signal?: AbortSignal,
    token?: string,
): Promise<DashboardResponse> {
    return apiRequest <DashboardResponse>(
        "/api/dashboard",
        {
            signal,
            cache: "no-store",
        },
        token,
    );
}
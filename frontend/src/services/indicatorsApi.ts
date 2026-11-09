import type { IndicatorsResponse,  ServiceIndicatorHistoryResponse } from "../types/indicators";
import { apiRequest } from "./api";


type IndicatorsPeriod ={
    start: string;
    end: string;
};

export async function getServiceIndicators (
    period: IndicatorsPeriod,
    signal?: AbortSignal,
    token?:string,
): Promise<IndicatorsResponse> {
    const params = new URLSearchParams({
        start: period.start,
        end: period.end,
    });

    return apiRequest<IndicatorsResponse>(
        `/api/indicadores?${params.toString()}`,
        {
            signal,
            cache: "no-store",
        },
        token,
    );
}

export async function getServiceIndicatorHistory(
  serviceId: number,
  period: IndicatorsPeriod,
  signal?: AbortSignal,
  token?: string,
): Promise<ServiceIndicatorHistoryResponse> {
  const params = new URLSearchParams({
    start: period.start,
    end: period.end,
  });

  return apiRequest<ServiceIndicatorHistoryResponse>(
    `/api/indicadores/${serviceId}/historico?${params.toString()}`,
    {
      signal,
      cache: "no-store",
    },
    token,
  );
}
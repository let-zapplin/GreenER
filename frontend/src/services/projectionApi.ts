import type {
  LocationProjectionResponse,
  ProjectionRegionsResponse,
  ServiceRedistributionPolicy,
  ServiceRedistributionResponse,
} from "../types/projection";

import { apiRequest } from "./api";

type ProjectionPeriod = {
  start: string;
  end: string;
};

export async function getProjectionRegions(
  signal?: AbortSignal,
  token?: string,
): Promise<ProjectionRegionsResponse> {
  return apiRequest<ProjectionRegionsResponse>(
    "/api/projecoes/regioes",
    {
      signal,
      cache: "no-store",
    },
    token,
  );
}

export async function projectServiceLocation(
  serviceId: number,
  period: ProjectionPeriod,
  regionCodes: string[],
  signal?: AbortSignal,
  token?: string,
): Promise<LocationProjectionResponse> {
  return apiRequest<LocationProjectionResponse>(
    "/api/projecoes/localizacao",
    {
      method: "POST",

      signal,

      cache: "no-store",

      body: JSON.stringify({
        serviceId,

        start: period.start,
        end: period.end,

        regionCodes,
      }),
    },
    token,
  );
}

export async function redistributeServices(
  period: ProjectionPeriod,
  occupancyPolicy: ServiceRedistributionPolicy,
  signal?: AbortSignal,
  token?: string,
): Promise<ServiceRedistributionResponse> {
  return apiRequest<ServiceRedistributionResponse>(
    "/api/projecoes/redistribuicao",
    {
      method: "POST",
      signal,
      cache: "no-store",
      body: JSON.stringify({
        start: period.start,
        end: period.end,
        occupancyPolicy,
      }),
    },
    token,
  );
}
import {
  apiFileRequest,
} from "./api";

import type {
  AnalysisPeriodWindow,
} from "./analysisPeriod";

import type {
  ComparisonMetric,
} from "../types/comparison";

export function getIndividualAnalysisReport(
  serviceId: number,
  period: AnalysisPeriodWindow,
  token: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const params =
    new URLSearchParams({
      start: period.start,
      end: period.end,
    });

  return apiFileRequest(
    `/api/relatorios/analise-individual/${serviceId}?${params.toString()}`,
    {
      method: "GET",
      signal,
    },
    token,
  );
}

/* ======================================================
   RELATÓRIO COMPARATIVO
====================================================== */

export function getComparisonAnalysisReport(
  serviceIds: number[],
  metric: ComparisonMetric,
  period: AnalysisPeriodWindow,
  token: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const params =
    new URLSearchParams({
      serviceIds:
        serviceIds.join(","),

      metric,

      start: period.start,

      end: period.end,
    });

  return apiFileRequest(
    `/api/relatorios/comparacao?${params.toString()}`,
    {
      method: "GET",
      signal,
    },
    token,
  );
}

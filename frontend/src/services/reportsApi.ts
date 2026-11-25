import {
  apiFileRequest,
} from "./api";

import type {
  AnalysisPeriodWindow,
} from "./analysisPeriod";

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
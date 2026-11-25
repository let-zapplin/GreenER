import {
  useCallback,
  useState,
} from "react";

import { useAuth } from "./useAuth";

import {
  ApiError,
} from "../services/api";

import {
  getComparisonAnalysisReport,
  getIndividualAnalysisReport,
} from "../services/reportsApi";

import type {
  AnalysisPeriodWindow,
} from "../services/analysisPeriod";

import type {
  ComparisonMetric,
} from "../types/comparison";

/* ======================================================
   HELPERS
====================================================== */

function sanitizeFileName(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9-_]+/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^-|-$/g,
      "",
    )
    .toLowerCase();
}

function triggerBlobDownload(
  blob: Blob,
  fileName: string,
): void {
  const objectUrl =
    URL.createObjectURL(
      blob,
    );

  const link =
    document.createElement(
      "a",
    );

  link.href =
    objectUrl;

  link.download =
    fileName;

  document.body.appendChild(
    link,
  );

  link.click();

  link.remove();

  /*
   * Dá tempo para o navegador iniciar
   * o download antes de liberar a URL.
   */
  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    },
    1_000,
  );
}

/* ======================================================
   HOOK
====================================================== */

export function useAnalysisReport() {
  const {
    token,
    logout,
  } = useAuth();

  const [
    isGeneratingReport,
    setIsGeneratingReport,
  ] = useState(false);

  const [
    reportError,
    setReportError,
  ] =
    useState<
      string | null
    >(null);

  /* ====================================================
     TRATAMENTO DE ERRO
  ==================================================== */

  const handleReportError =
    useCallback(
      (
        error: unknown,
      ): false => {
        if (
          error instanceof
            ApiError &&
          error.status ===
            401
        ) {
          logout();

          setReportError(
            "Sua sessão expirou. Entre novamente para gerar o relatório.",
          );

          return false;
        }

        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          setReportError(
            "A geração do relatório foi cancelada.",
          );

          return false;
        }

        if (
          error instanceof
          ApiError
        ) {
          setReportError(
            error.message,
          );

          return false;
        }

        setReportError(
          "Não foi possível gerar o relatório. Tente novamente.",
        );

        return false;
      },
      [
        logout,
      ],
    );

  /* ====================================================
     RELATÓRIO INDIVIDUAL
  ==================================================== */

  const downloadIndividualReport =
    useCallback(
      async (
        serviceId: number,
        serviceName: string,
        period:
          AnalysisPeriodWindow,
      ): Promise<boolean> => {
        if (!token) {
          setReportError(
            "Sua sessão não está disponível. Entre novamente para gerar o relatório.",
          );

          return false;
        }

        setIsGeneratingReport(
          true,
        );

        setReportError(
          null,
        );

        try {
          const pdf =
            await getIndividualAnalysisReport(
              serviceId,
              period,
              token,
            );

          const safeName =
            sanitizeFileName(
              serviceName,
            );

          triggerBlobDownload(
            pdf,
            `greener-relatorio-${safeName || serviceId}.pdf`,
          );

          return true;
        } catch (error) {
          return handleReportError(
            error,
          );
        } finally {
          setIsGeneratingReport(
            false,
          );
        }
      },
      [
        token,
        handleReportError,
      ],
    );

  /* ====================================================
     RELATÓRIO COMPARATIVO
  ==================================================== */

  const downloadComparisonReport =
    useCallback(
      async (
        serviceIds: number[],
        metric:
          ComparisonMetric,
        period:
          AnalysisPeriodWindow,
      ): Promise<boolean> => {
        if (!token) {
          setReportError(
            "Sua sessão não está disponível. Entre novamente para gerar o relatório.",
          );

          return false;
        }

        if (
          serviceIds.length < 2
        ) {
          setReportError(
            "Selecione pelo menos dois serviços para gerar o relatório comparativo.",
          );

          return false;
        }

        setIsGeneratingReport(
          true,
        );

        setReportError(
          null,
        );

        try {
          const pdf =
            await getComparisonAnalysisReport(
              serviceIds,
              metric,
              period,
              token,
            );

          triggerBlobDownload(
            pdf,
            `greener-relatorio-comparacao-${metric}.pdf`,
          );

          return true;
        } catch (error) {
          return handleReportError(
            error,
          );
        } finally {
          setIsGeneratingReport(
            false,
          );
        }
      },
      [
        token,
        handleReportError,
      ],
    );

  /* ====================================================
     LIMPEZA DE ERRO
  ==================================================== */

  const clearReportError =
    useCallback(
      () => {
        setReportError(
          null,
        );
      },
      [],
    );

  return {
    downloadIndividualReport,

    downloadComparisonReport,

    isGeneratingReport,

    reportError,

    clearReportError,
  };
}

import {
  useCallback,
  useState,
} from "react";

import { useAuth } from "./useAuth";

import {
  ApiError,
} from "../services/api";

import {
  getIndividualAnalysisReport,
} from "../services/reportsApi";

import type {
  AnalysisPeriodWindow,
} from "../services/analysisPeriod";

/* ======================================================
   AUXILIARES
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
  ] = useState<string | null>(
    null,
  );

  const downloadIndividualReport =
    useCallback(
      async (
        serviceId: number,
        serviceName: string,
        period: AnalysisPeriodWindow,
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

        setReportError(null);

        const controller =
          new AbortController();

        try {
          const pdf =
            await getIndividualAnalysisReport(
              serviceId,
              period,
              token,
              controller.signal,
            );

          /*
           * O Blob recebido da API ainda está apenas
           * em memória.
           *
           * createObjectURL cria uma URL temporária
           * que o navegador consegue acessar.
           */
          const objectUrl =
            URL.createObjectURL(
              pdf,
            );

          const link =
            document.createElement(
              "a",
            );

          const safeName =
            sanitizeFileName(
              serviceName,
            );

          link.href =
            objectUrl;

          link.download =
            `greener-relatorio-${safeName || serviceId}.pdf`;

          /*
           * Inserimos temporariamente o elemento no DOM.
           *
           * O click programático dispara o comportamento
           * normal de download do navegador.
           */
          document.body.appendChild(
            link,
          );

          link.click();

          link.remove();

          /*
           * A URL é temporária e ocupa memória.
           * Depois do download, ela não é mais necessária.
           */
          URL.revokeObjectURL(
            objectUrl,
          );

          return true;
        } catch (error) {
          if (
            error instanceof
              ApiError &&
            error.status === 401
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
        } finally {
          setIsGeneratingReport(
            false,
          );
        }
      },
      [
        token,
        logout,
      ],
    );

  const clearReportError =
    useCallback(() => {
      setReportError(null);
    }, []);

  return {
    downloadIndividualReport,

    isGeneratingReport,

    reportError,

    clearReportError,
  };
}
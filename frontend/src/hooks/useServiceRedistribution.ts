import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "./useAuth";

import { ApiError } from "../services/api";
import { redistributeServices } from "../services/projectionApi";

import type { AnalysisPeriodWindow } from "../services/analysisPeriod";
import type {
  ServiceRedistributionPolicy,
  ServiceRedistributionResponse,
} from "../types/projection";

export function useServiceRedistribution() {
  const { token, logout } = useAuth();

  const [result, setResult] =
    useState<ServiceRedistributionResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const activeRequest =
    useRef<AbortController | null>(null);

  /* =======================================================
     LIMPEZA AO DESMONTAR O HOOK

     Se houver uma requisição em andamento quando o
     componente sair da tela, ela é cancelada.
     ======================================================= */

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    },
    [],
  );

  /* =======================================================
     RESET

     Limpa completamente o estado da redistribuição.
     ======================================================= */

  const reset = useCallback(() => {
    activeRequest.current?.abort();
    activeRequest.current = null;

    setResult(null);
    setLoading(false);
    setError(null);
  }, []);

  /* =======================================================
     EXECUÇÃO DA REDISTRIBUIÇÃO
     ======================================================= */

  const run = useCallback(
    async (
      period: AnalysisPeriodWindow,
      occupancyPolicy: ServiceRedistributionPolicy,
    ) => {
      /* ---------------------------------------------------
         VALIDAÇÃO DA SESSÃO
         --------------------------------------------------- */

      if (!token) {
        setResult(null);
        setLoading(false);

        setError(
          "Sua sessão expirou. Faça login novamente.",
        );

        return;
      }

      /* ---------------------------------------------------
         CANCELA REQUISIÇÃO ANTERIOR

         Isso evita que uma resposta antiga sobrescreva
         uma seleção mais recente do usuário.
         --------------------------------------------------- */

      activeRequest.current?.abort();

      const controller =
        new AbortController();

      activeRequest.current =
        controller;

      /*
       * Importante:
       *
       * NÃO usamos setResult(null) aqui.
       *
       * Assim o resultado anterior continua visível
       * enquanto o novo cenário é carregado.
       */

      setLoading(true);
      setError(null);

      try {
        /* -------------------------------------------------
           CHAMADA DA API
           ------------------------------------------------- */

        const response =
          await redistributeServices(
            period,
            occupancyPolicy,
            controller.signal,
            token,
          );

        /* -------------------------------------------------
           ATUALIZA SOMENTE SE ESTA AINDA FOR
           A REQUISIÇÃO ATIVA
           ------------------------------------------------- */

        if (
          activeRequest.current === controller
        ) {
          setResult(response);
        }
      } catch (requestError) {
        /* -------------------------------------------------
           REQUISIÇÃO CANCELADA

           AbortController faz parte do fluxo normal quando
           uma nova consulta substitui a anterior.
           ------------------------------------------------- */

        if (
          controller.signal.aborted ||
          activeRequest.current !== controller
        ) {
          return;
        }

        /* -------------------------------------------------
           TOKEN EXPIRADO
           ------------------------------------------------- */

        if (
          requestError instanceof ApiError &&
          requestError.status === 401
        ) {
          logout();

          setError(
            "Sua sessão expirou. Faça login novamente.",
          );

          return;
        }

        /* -------------------------------------------------
           OUTROS ERROS
           ------------------------------------------------- */

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Não foi possível calcular a redistribuição.",
        );
      } finally {
        /* -------------------------------------------------
           FINALIZA SOMENTE A REQUISIÇÃO ATUAL

           Uma requisição antiga cancelada não deve alterar
           o loading de uma nova requisição em andamento.
           ------------------------------------------------- */

        if (
          activeRequest.current === controller
        ) {
          activeRequest.current = null;
          setLoading(false);
        }
      }
    },
    [
      logout,
      token,
    ],
  );

  /* =======================================================
     API DO HOOK
     ======================================================= */

  return {
    result,
    loading,
    error,
    run,
    reset,
  };
}
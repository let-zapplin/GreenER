import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ANALYSIS_PERIODS,
  DEFAULT_ANALYSIS_PERIOD_MS,
  createAnalysisPeriodWindow,
  isSupportedAnalysisPeriod,
  type AnalysisPeriodWindow,
} from "../services/analysisPeriod";

const ANALYSES_PERIOD_STORAGE_KEY =
  "greener:analyses:period";

const ANALYSIS_WINDOW_REFRESH_INTERVAL_MS =
  60_000;

type AnalysisPeriodState = {
  durationMs: number;
  window: AnalysisPeriodWindow;
};

function getInitialDurationMs(): number {
  const savedPeriod = Number(
    localStorage.getItem(
      ANALYSES_PERIOD_STORAGE_KEY,
    ),
  );

  return isSupportedAnalysisPeriod(savedPeriod)
    ? savedPeriod
    : DEFAULT_ANALYSIS_PERIOD_MS;
}

export function useAnalysisPeriod() {
  const [state, setState] =
    useState<AnalysisPeriodState>(() => {
      const durationMs =
        getInitialDurationMs();

      return {
        durationMs,
        window:
          createAnalysisPeriodWindow(
            durationMs,
          ),
      };
    });

  const selectPeriod = useCallback(
    (durationMs: number) => {
      if (
        !isSupportedAnalysisPeriod(
          durationMs,
        )
      ) {
        return;
      }

      setState({
        durationMs,
        window:
          createAnalysisPeriodWindow(
            durationMs,
          ),
      });
    },
    [],
  );

  const refreshWindow = useCallback(
    () => {
      setState((current) => ({
        ...current,
        window:
          createAnalysisPeriodWindow(
            current.durationMs,
          ),
      }));
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem(
      ANALYSES_PERIOD_STORAGE_KEY,
      String(state.durationMs),
    );
  }, [state.durationMs]);

  useEffect(() => {
    const refreshTimer =
      window.setInterval(
        refreshWindow,
        ANALYSIS_WINDOW_REFRESH_INTERVAL_MS,
      );

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [refreshWindow]);

  return {
    periods: ANALYSIS_PERIODS,
    durationMs: state.durationMs,
    period: state.window,
    selectPeriod,
    refreshWindow,
  };
}
export type DashboardResponse = {
  message: string;

  period: {
    start: string;
    end: string;
  };

  summary: {
    energyKwh: number;
    emissionsGco2e: number;

    activeServiceCount: number;
    noMetricsServiceCount: number;
    unavailableServiceCount: number;

    isPartial: boolean;
  };
};
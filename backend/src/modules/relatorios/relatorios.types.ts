export interface IndividualAnalysisReportData {
  generatedAt: Date;

  period: {
    start: string;
    end: string;
  };

  service: {
    serviceId: number;
    name: string;
    status: string;

    location: {
      regionCode: string;
      country: string;
      region: string;
      city: string | null;
    };
  };

  environmentalSummary: {
    energyKwh: number;
    emissionsGco2e: number;

    metricCoveragePercent: number;
    carbonIntensityCoveragePercent: number;

    isPartial: boolean;
  };

  resourceSummary: {
    cpu: {
      averagePercent: number | null;
      peakPercent: number | null;
    };

    memory: {
      averageGb: number | null;
      peakGb: number | null;
    };

    disk: {
      averageGb: number | null;
      peakGb: number | null;
    };

    network: {
      totalGb: number | null;
    };
  };

  history: Array<{
    attemptedAt: string;

    energyKwh: number | null;
    emissionsGco2e: number | null;

    gapReason: string | null;
  }>;
}

/* ======================================================
   RELATÓRIO COMPARATIVO
====================================================== */

export type ComparisonReportMetric =
  | "energy"
  | "emissions"
  | "cpu"
  | "memory"
  | "disk"
  | "network";

export interface ComparisonAnalysisReportData {
  generatedAt: Date;

  period: {
    start: string;
    end: string;
  };

  metric: {
    value: ComparisonReportMetric;
    label: string;
    unit: string;
    periodAggregationLabel: string;
  };

  services: Array<{
    serviceId: number;
    name: string;
    status: string;
    regionCode: string;

    periodValue: number | null;

    isPartial: boolean;

    history: Array<{
      attemptedAt: string;

      value: number | null;

      gapReason: string | null;

      temporalGap: boolean;
    }>;
  }>;

  failedServices: Array<{
    serviceId: number;
    name: string | null;
  }>;

  summary: {
    highestServiceId: number | null;
    lowestServiceId: number | null;

    highestValue: number | null;
    lowestValue: number | null;

    difference: number | null;

    isPartial: boolean;
  };
}
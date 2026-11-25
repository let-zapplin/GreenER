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
import type { CollectionStatus } from "./service";

export type IndicatorGapReason =
  | CollectionStatus
  | "invalid_metrics"
  | "collection_interval_unavailable"
  | "carbon_intensity_unavailable";

  export type IndicatorMetrics = {
  cpuPercent: number;
  memoryGb: number;
  diskGb: number;
  networkGb: number;
};

export type IndicatorSample = {
  collectionId: string;
  attemptedAt: string;
  status: CollectionStatus;

  metrics: IndicatorMetrics | null;

  collectionIntervalSeconds: number | null;

  energyKwh: number | null;
  emissionsGco2e: number | null;

  carbonIntensityGco2ePerKwh: number | null;

  gapReason: IndicatorGapReason | null;
};

export type IndicatorGap = {
  collectionId: string;
  attemptedAt: string;
  reason: IndicatorGapReason;
};

export type ServiceIndicators = {
  serviceId: number;
  name: string;
  status: string;
  regionCode: string;

  latestSampleInPeriod: IndicatorSample | null;

  periodTotals: {
    energyKwh: number;
    emissionsGco2e: number;

    collectionCount: number;
    validMetricCount: number;
    validCarbonIntensityCount: number;

    metricCoveragePercent: number;
    carbonIntensityCoveragePercent: number;

    isPartial: boolean;

    gaps: IndicatorGap[];
  };
};

export type IndicatorsResponse = {
  message: string;

  period: {
    start: string;
    end: string;
    collectionIntervalMs: number;
  };

  powerModel: {
    version: string;
    cpuMaximumWatts: number;
    memoryWattsPerGb: number;
    diskWattsPerGb: number;
    networkWattsPerGb: number;
  };

  summary: {
    serviceCount: number;
    activeServiceCount: number;

    energyKwh: number;
    emissionsGco2e: number;

    collectionCount: number;
    validMetricCount: number;
    validCarbonIntensityCount: number;

    metricCoveragePercent: number;
    carbonIntensityCoveragePercent: number;

    isPartial: boolean;
  };

  services: ServiceIndicators[];
};

export type ServiceIndicatorHistory = {
  period: {
    start: string;
    end: string;
    collectionIntervalMs: number;
  };

  service: {
    serviceId: number;
    name: string;
    status: string;
    regionCode: string;
  };

  samples: IndicatorSample[];
};

export type ServiceIndicatorHistoryResponse =
  ServiceIndicatorHistory & {
    message: string;
  };
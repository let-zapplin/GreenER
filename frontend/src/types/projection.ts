export type ProjectionRegion = {
  regionCode: string;

  country: string;
  region: string;
  city: string | null;

  latitude: number | null;
  longitude: number | null;

  carbonIntensityGco2ePerKwh: number;
  renewableSharePercent: number;

  snapshotRegisteredAt: string;
};

export type ProjectionRegionsResponse = {
  message: string;

  regions: ProjectionRegion[];
};

export type LocationProjectionScenario = {
  regionCode: string;

  country: string;
  region: string;
  city: string | null;

  latitude: number | null;
  longitude: number | null;

  carbonIntensityGco2ePerKwh: number;
  renewableSharePercent: number;

  projectedEmissionsGco2e: number | null;

  differenceGco2e: number | null;
  differencePercent: number | null;

  isCurrent: boolean;

  snapshotRegisteredAt: string;
};

export type LocationProjectionResponse = {
  message: string;

  service: {
    serviceId: number;
    name: string;
    currentRegionCode: string;
  };

  period: {
    start: string;
    end: string;
  };

  energyKwh: number | null;

  validEnergySampleCount: number;
  totalSampleCount: number;

  isPartial: boolean;

  scenarios: LocationProjectionScenario[];

  unavailableRegionCodes: string[];
};

export type ServiceRedistributionAllocation = {
  serviceId: number;
  name: string;
  currentRegionCode: string;
  assignedRegionCode: string;
  energyKwh: number | null;
  validEnergySampleCount: number;
  observedEmissionsGco2e: number | null;
  validObservedEmissionSampleCount: number;
  totalSampleCount: number;
  isPartial: boolean;
  projectedEmissionsGco2e: number | null;
};

export type ServiceRedistributionRegion = {
  regionCode: string;
  serviceCount: number;
  carbonIntensityGco2ePerKwh: number;
  renewableSharePercent: number;
  snapshotRegisteredAt: string;
};

export type ServiceRedistributionPolicy =
  | "preserve_current_counts"
  | "balanced"
  | "unconstrained";

export type ServiceRedistributionResponse = {
  message: string;
  period: {
    start: string;
    end: string;
  };
  occupancyPolicy: ServiceRedistributionPolicy;
  requireServicePerRegion: boolean;
  allocations: ServiceRedistributionAllocation[];
  regions: ServiceRedistributionRegion[];
  knownProjectedEmissionsGco2e: number;
  isPartial: boolean;
  unavailableRegionCodes: string[];
};
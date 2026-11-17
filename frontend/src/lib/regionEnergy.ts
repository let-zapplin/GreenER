import type { ServiceIndicators } from "../types/indicators";
import type { MonitoredService } from "../types/service";

export type RegionEnergy = {
  regionCode: string;
  region: string;
  energyKwh: number;
  serviceCount: number;
  isPartial: boolean;
};

export function groupEnergyByRegion(
  indicators: ServiceIndicators[],
  services: MonitoredService[],
): RegionEnergy[] {
  const serviceById = new Map<number, MonitoredService>();
  for (const service of services) {
    serviceById.set(service.serviceId, service);
  }
  const regions = new Map<string, RegionEnergy>();

  for (const indicator of indicators) {
    const { periodTotals } = indicator;

    if (
      indicator.status !== "active" ||
      periodTotals.validMetricCount === 0 ||
      !Number.isFinite(periodTotals.energyKwh) ||
      periodTotals.energyKwh < 0
    ) {
      continue;
    }

    const regionCode = indicator.regionCode.trim() || "unknown";
    const service = serviceById.get(indicator.serviceId);
    const region = regions.get(regionCode) ?? {
      regionCode,
      region: service?.location.region || regionCode,
      energyKwh: 0,
      serviceCount: 0,
      isPartial: false,
    };

    region.energyKwh += periodTotals.energyKwh;
    region.serviceCount += 1;
    region.isPartial ||= periodTotals.isPartial;
    regions.set(regionCode, region);
  }

  return [...regions.values()].sort((first, second) =>
    second.energyKwh - first.energyKwh ||
    first.regionCode.localeCompare(second.regionCode),
  );
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { groupEnergyByRegion } from "../src/lib/regionEnergy.ts";
import type { ServiceIndicators } from "../src/types/indicators.ts";
import type { MonitoredService } from "../src/types/service.ts";

function indicator(
  serviceId: number,
  regionCode: string,
  energyKwh: number,
  status = "active",
  validMetricCount = 1,
): ServiceIndicators {
  return {
    serviceId,
    name: `Service ${serviceId}`,
    status,
    regionCode,
    latestSampleInPeriod: null,
    periodTotals: {
      energyKwh,
      emissionsGco2e: 0,
      collectionCount: 1,
      validMetricCount,
      validCarbonIntensityCount: 1,
      metricCoveragePercent: 100,
      carbonIntensityCoveragePercent: 100,
      isPartial: false,
      gaps: [],
    },
  };
}

const services: MonitoredService[] = [
  {
    id: "api-1",
    serviceId: 1,
    name: "API 1",
    status: "active",
    location: {
      region_code: "BR-SP",
      country: "Brasil",
      region: "São Paulo",
      city: null,
      latitude: null,
      longitude: null,
    },
  },
  {
    id: "api-2",
    serviceId: 2,
    name: "API 2",
    status: "active",
    location: {
      region_code: "BR-SP",
      country: "Brasil",
      region: "São Paulo",
      city: null,
      latitude: null,
      longitude: null,
    },
  },
];

test("soma energia por código regional e ignora serviços sem amostras calculáveis", () => {
  const result = groupEnergyByRegion(
    [
      indicator(1, "BR-SP", 0.25),
      indicator(2, "BR-SP", 0.75),
      indicator(3, "BR-RJ", 2, "active", 0),
      indicator(4, "BR-MG", 4, "removed"),
    ],
    services,
  );

  assert.deepEqual(result, [
    {
      regionCode: "BR-SP",
      region: "São Paulo",
      energyKwh: 1,
      serviceCount: 2,
      isPartial: false,
    },
  ]);
});

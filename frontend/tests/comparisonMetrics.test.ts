import assert from "node:assert/strict";
import { test } from "node:test";

import { getComparisonPeriodValue } from "../src/lib/comparisonMetrics.ts";
import type { ComparisonMetric } from "../src/types/comparison.ts";
import type { ServiceIndicators } from "../src/types/indicators.ts";

// Os valores da última amostra, das médias e dos picos são diferentes
// para detectar o uso de uma informação incorreta na comparação do período.
function createService(): ServiceIndicators {
  return {
    serviceId: 1,
    name: "API de teste",
    status: "active",
    regionCode: "BR-SP",
    latestSampleInPeriod: {
      collectionId: "collection-1",
      attemptedAt: "2026-11-21T12:00:00.000Z",
      status: "success",
      metrics: { cpuPercent: 80, memoryGb: 8, diskGb: 40, networkGb: 2 },
      collectionIntervalSeconds: 60,
      energyKwh: 0.1,
      emissionsGco2e: 20,
      carbonIntensityGco2ePerKwh: 200,
      gapReason: null,
    },
    resourceSummary: {
      cpu: { averagePercent: 30, peakPercent: 90 },
      memory: { averageGb: 4, peakGb: 10 },
      disk: { averageGb: 20, peakGb: 50 },
      network: { totalGb: 12 },
    },
    energyBreakdown: {
      cpuKwh: 0.4,
      memoryKwh: 0.3,
      diskKwh: 0.2,
      networkKwh: 0.1,
    },
    regionalContext: {
      regionCode: "BR-SP",
      carbonIntensityGco2ePerKwh: 200,
      renewableSharePercent: 60,
    },
    periodTotals: {
      energyKwh: 1,
      emissionsGco2e: 200,
      collectionCount: 10,
      validMetricCount: 10,
      validCarbonIntensityCount: 10,
      metricCoveragePercent: 100,
      carbonIntensityCoveragePercent: 100,
      isPartial: false,
      gaps: [],
    },
  };
}

test("usa os totais do período para energia e emissão, sem usar a última amostra", () => {
  const service = createService();

  assert.equal(getComparisonPeriodValue(service, "energy"), 1);
  assert.equal(getComparisonPeriodValue(service, "emissions"), 200);
});

test("usa as médias de CPU, memória e disco, sem usar os picos", () => {
  const service = createService();

  assert.equal(getComparisonPeriodValue(service, "cpu"), 30);
  assert.equal(getComparisonPeriodValue(service, "memory"), 4);
  assert.equal(getComparisonPeriodValue(service, "disk"), 20);
});

test("usa o total de rede do período, sem usar a última amostra", () => {
  assert.equal(getComparisonPeriodValue(createService(), "network"), 12);
});

test("preserva recursos ausentes como null em um serviço parcial", () => {
  const service = createService();
  service.periodTotals.isPartial = true;
  service.resourceSummary = {
    cpu: { averagePercent: null, peakPercent: null },
    memory: { averageGb: null, peakGb: null },
    disk: { averageGb: null, peakGb: null },
    network: { totalGb: null },
  };

  // Ausência de informação não deve virar consumo zero na comparação.
  const metrics: ComparisonMetric[] = ["cpu", "memory", "disk", "network"];
  for (const metric of metrics) {
    assert.equal(getComparisonPeriodValue(service, metric), null);
  }
});

test("preserva valores zero sem confundi-los com dados ausentes", () => {
  const service = createService();
  service.periodTotals.energyKwh = 0;
  service.periodTotals.emissionsGco2e = 0;
  service.resourceSummary = {
    cpu: { averagePercent: 0, peakPercent: 0 },
    memory: { averageGb: 0, peakGb: 0 },
    disk: { averageGb: 0, peakGb: 0 },
    network: { totalGb: 0 },
  };

  const metrics: ComparisonMetric[] = [
    "energy", "emissions", "cpu", "memory", "disk", "network",
  ];
  for (const metric of metrics) {
    assert.equal(getComparisonPeriodValue(service, metric), 0);
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateEmissionDifferencePercent,
  calculateRedistributionEmissionSubtotal,
} from "../src/lib/redistributionEmissions.ts";

test("calcula a variação percentual positiva e negativa", () => {
  assert.equal(
    calculateEmissionDifferencePercent({
      observedEmissionsGco2e: 100,
      projectedEmissionsGco2e: 125,
      validEnergySampleCount: 2,
      validObservedEmissionSampleCount: 2,
    }),
    25,
  );
  assert.equal(
    calculateEmissionDifferencePercent({
      observedEmissionsGco2e: 100,
      projectedEmissionsGco2e: 80,
      validEnergySampleCount: 2,
      validObservedEmissionSampleCount: 2,
    }),
    -20,
  );
});

test("não calcula variação sem cobertura comparável ou com base zero", () => {
  assert.equal(
    calculateEmissionDifferencePercent({
      observedEmissionsGco2e: 100,
      projectedEmissionsGco2e: 125,
      validEnergySampleCount: 2,
      validObservedEmissionSampleCount: 1,
    }),
    null,
  );
  assert.equal(
    calculateEmissionDifferencePercent({
      observedEmissionsGco2e: null,
      projectedEmissionsGco2e: 10,
      validEnergySampleCount: 0,
      validObservedEmissionSampleCount: 0,
    }),
    null,
  );
  assert.equal(
    calculateEmissionDifferencePercent({
      observedEmissionsGco2e: 0,
      projectedEmissionsGco2e: 0,
      validEnergySampleCount: 1,
      validObservedEmissionSampleCount: 1,
    }),
    null,
  );
});

test("subtotaliza somente serviços com ambas as emissões calculáveis", () => {
  const result = calculateRedistributionEmissionSubtotal([
    {
      observedEmissionsGco2e: 10,
      projectedEmissionsGco2e: 8,
      validEnergySampleCount: 1,
      validObservedEmissionSampleCount: 1,
    },
    {
      observedEmissionsGco2e: null,
      projectedEmissionsGco2e: 100,
      validEnergySampleCount: 1,
      validObservedEmissionSampleCount: 0,
    },
    {
      observedEmissionsGco2e: 30,
      projectedEmissionsGco2e: null,
      validEnergySampleCount: 2,
      validObservedEmissionSampleCount: 2,
    },
    {
      observedEmissionsGco2e: 10,
      projectedEmissionsGco2e: 18,
      validEnergySampleCount: 2,
      validObservedEmissionSampleCount: 2,
    },
    {
      observedEmissionsGco2e: 100,
      projectedEmissionsGco2e: 200,
      validEnergySampleCount: 2,
      validObservedEmissionSampleCount: 1,
    },
  ]);

  assert.deepEqual(result, {
    comparableServiceCount: 2,
    observedEmissionsGco2e: 20,
    projectedEmissionsGco2e: 26,
    differencePercent: 30,
  });
});

test("devolve subtotal não calculável sem serviços comparáveis", () => {
  assert.deepEqual(calculateRedistributionEmissionSubtotal([]), {
    comparableServiceCount: 0,
    observedEmissionsGco2e: null,
    projectedEmissionsGco2e: null,
    differencePercent: null,
  });
});

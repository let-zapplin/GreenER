export type RedistributionEmissionValues = {
  observedEmissionsGco2e: number | null;

  comparableProjectedEmissionsGco2e: number | null;

  validEnergySampleCount: number;
  validObservedEmissionSampleCount: number;
};

export type RedistributionEmissionSubtotal = {
  comparableServiceCount: number;
  observedEmissionsGco2e: number | null;
  projectedEmissionsGco2e: number | null;
  differencePercent: number | null;
};

export function hasComparableEmissionCoverage(
  validEnergySampleCount: number,
  validObservedEmissionSampleCount: number,
): boolean {
  return (
    validObservedEmissionSampleCount > 0 &&
    validObservedEmissionSampleCount <= validEnergySampleCount
  );
}

export function calculateEmissionDifferencePercent(
  values: RedistributionEmissionValues,
): number | null {
  const {
    observedEmissionsGco2e,
    comparableProjectedEmissionsGco2e,
    validEnergySampleCount,
    validObservedEmissionSampleCount,
  } = values;

  if (
    !hasComparableEmissionCoverage(
      validEnergySampleCount,
      validObservedEmissionSampleCount,
    ) ||
    observedEmissionsGco2e === null ||
    comparableProjectedEmissionsGco2e === null ||
    observedEmissionsGco2e === 0
  ) {
    return null;
  }

  return (
    ((comparableProjectedEmissionsGco2e - observedEmissionsGco2e) /
      observedEmissionsGco2e) *
    100
  );
}

export function calculateRedistributionEmissionSubtotal(
  allocations: readonly RedistributionEmissionValues[],
): RedistributionEmissionSubtotal {
  const comparableEmissions = allocations.flatMap((allocation) => {
    const observedEmissionsGco2e = allocation.observedEmissionsGco2e;
    const projectedEmissionsGco2e =
      allocation.comparableProjectedEmissionsGco2e;

    if (
      observedEmissionsGco2e === null ||
      projectedEmissionsGco2e === null ||
      !hasComparableEmissionCoverage(
        allocation.validEnergySampleCount,
        allocation.validObservedEmissionSampleCount,
      )
    ) {
      return [];
    }

return [
  {
    observedEmissionsGco2e,

    comparableProjectedEmissionsGco2e:
      projectedEmissionsGco2e,

    validEnergySampleCount:
      allocation.validEnergySampleCount,

    validObservedEmissionSampleCount:
      allocation.validObservedEmissionSampleCount,
  },
];
  });

  if (comparableEmissions.length === 0) {
    return {
      comparableServiceCount: 0,
      observedEmissionsGco2e: null,
      projectedEmissionsGco2e: null,
      differencePercent: null,
    };
  }

  const observedEmissionsGco2e = comparableEmissions.reduce(
    (total, emissions) => total + emissions.observedEmissionsGco2e,
    0,
  );
  const projectedEmissionsGco2e =
  comparableEmissions.reduce(
    (total, emissions) =>
      total +
      (emissions.comparableProjectedEmissionsGco2e ?? 0),
    0,
  );
  const validEnergySampleCount = comparableEmissions.reduce(
    (total, emissions) => total + emissions.validEnergySampleCount,
    0,
  );
  const validObservedEmissionSampleCount = comparableEmissions.reduce(
    (total, emissions) => total + emissions.validObservedEmissionSampleCount,
    0,
  );

  return {
    comparableServiceCount: comparableEmissions.length,
    observedEmissionsGco2e,
    projectedEmissionsGco2e,
    differencePercent: calculateEmissionDifferencePercent({
      observedEmissionsGco2e,
      comparableProjectedEmissionsGco2e:
      projectedEmissionsGco2e,
      validEnergySampleCount,
      validObservedEmissionSampleCount,
    }),
  };
}

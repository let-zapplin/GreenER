export const COMPARISON_SERIES_COLORS = [
  "#8BFF5D",
  "#36D9FF",
  "#FFB347",
  "#FF66D8",
];

export function getComparisonServiceColor(
  serviceId: number,
  serviceIds: number[],
): string {
  const index = serviceIds.indexOf(serviceId);

  const safeIndex =
    index >= 0 ? index : 0;

  return COMPARISON_SERIES_COLORS[
    safeIndex %
      COMPARISON_SERIES_COLORS.length
  ];
}

export function getComparisonServiceOpacity(
  serviceId: number,
  serviceIds: number[],
  focusServiceId: number | null,
): number {
  if (serviceId === focusServiceId) {
    return 1;
  }

  const secondaryServiceIds =
    serviceIds.filter(
      (currentServiceId) =>
        currentServiceId !== focusServiceId,
    );

  const secondaryIndex =
    secondaryServiceIds.indexOf(serviceId);

  return (
    [0.7, 0.5, 0.3][secondaryIndex] ??
    0.3
  );
}
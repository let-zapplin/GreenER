export const COMPARISON_SERIES_COLORS = [
  "#8BFF5D",
  "#36D9FF",
  "#FFB347",
  "#FF66D8",
  "#B58CFF",
  "#FFF06A",
  "#48E0C2",
  "#FF7A7A",
];
export function getComparisonServiceColor(
  serviceId: number,
  serviceIds: number[],
): string {
  const index = serviceIds.indexOf(serviceId);

  const safeIndex = index >= 0 ? index : 0;

  return COMPARISON_SERIES_COLORS[
    safeIndex % COMPARISON_SERIES_COLORS.length
  ];
}

export function getComparisonServiceOpacity(
  serviceId: number,
  _serviceIds: number[],
  focusServiceId: number | null,
): number {
  if (focusServiceId === null) {
    return 1;
  }

  return serviceId === focusServiceId ? 1 : 0.35;
}

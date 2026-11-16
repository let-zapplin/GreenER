import type { ComparisonMetric } from "../types/comparison";
import type { ServiceIndicators } from "../types/indicators";

export type ComparisonMetricDefinition = {
  value: ComparisonMetric;
  label: string;
  unit: string;
  periodAggregationLabel: string;
};
export const COMPARISON_METRICS: ComparisonMetricDefinition[] = [
  {
    value: "energy",
    label: "Energia",
    unit: "kWh",
    periodAggregationLabel: "Total no período",
  },
  {
    value: "emissions",
    label: "CO₂e",
    unit: "gCO₂e",
    periodAggregationLabel: "Total no período",
  },
  {
    value: "cpu",
    label: "CPU",
    unit: "%",
    periodAggregationLabel: "Média no período",
  },
  {
    value: "memory",
    label: "Memória",
    unit: "GB",
    periodAggregationLabel: "Média no período",
  },
  {
    value: "disk",
    label: "Disco",
    unit: "GB",
    periodAggregationLabel: "Média no período",
  },
  {
    value: "network",
    label: "Rede",
    unit: "GB",
    periodAggregationLabel: "Total no período",
  },
];
export function getComparisonMetricDefinition(
  metric: ComparisonMetric,
): ComparisonMetricDefinition {
  return (
    COMPARISON_METRICS.find((option) => option.value === metric) ??
    COMPARISON_METRICS[0]
  );
}

export function formatComparisonValue(
  value: number,
  metric: ComparisonMetric,
): string {
  switch (metric) {
    case "energy":
      return value.toLocaleString("pt-BR", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      });

    case "emissions":
      return value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });

    case "cpu":
      return value.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      });

    case "memory":
    case "disk":
    case "network":
      return value.toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
      });
  }
}

export function getComparisonPeriodValue(
  service: ServiceIndicators,
  metric: ComparisonMetric,
): number | null {
  switch (metric) {
    case "energy":
      return service.periodTotals.energyKwh;

    case "emissions":
      return service.periodTotals.emissionsGco2e;

    case "cpu":
      return service.resourceSummary.cpu.averagePercent;

    case "memory":
      return service.resourceSummary.memory.averageGb;

    case "disk":
      return service.resourceSummary.disk.averageGb;

    case "network":
      return service.resourceSummary.network.totalGb;
  }
}

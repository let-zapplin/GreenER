import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  IndicadoresRepository,
  type IndicatorCollection,
  type ServiceIndicatorData,
} from "./indicadores.repository.js";

const POWER_MODEL = {
  version: "1",
  cpuMaximumWatts: 100,
  memoryWattsPerGb: 0.375,
  diskWattsPerGb: 0.01,
  networkWattsPerGb: 0.02,
} as const;

type CalculationGapReason =
  | IndicatorCollection["status"]
  | "invalid_metrics"
  | "carbon_intensity_unavailable";

interface CalculationGap {
  collectionId: string;
  attemptedAt: Date;
  reason: CalculationGapReason;
}

interface SampleCalculation {
  collectionId: string;
  attemptedAt: Date;
  status: IndicatorCollection["status"];
  energyKwh: number | null;
  emissionsGco2e: number | null;
  carbonIntensityGco2ePerKwh: number | null;
  gapReason: CalculationGapReason | null;
}

interface ServiceIndicators {
  serviceId: number;
  name: string;
  status: string;
  regionCode: string;
  latestSampleInPeriod: SampleCalculation | null;
  periodTotals: {
    energyKwh: number;
    emissionsGco2e: number;
    collectionCount: number;
    validMetricCount: number;
    validCarbonIntensityCount: number;
    metricCoveragePercent: number;
    carbonIntensityCoveragePercent: number;
    isPartial: boolean;
    gaps: CalculationGap[];
  };
}

function parseDate(value: string, field: string): Date {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(
      `O parâmetro ${field} deve ser uma data ISO válida`,
      400,
      "INVALID_INDICATOR_PERIOD",
    );
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new AppError(
      `O parâmetro ${field} deve ser uma data ISO válida`,
      400,
      "INVALID_INDICATOR_PERIOD",
    );
  }

  return new Date(timestamp);
}

function finiteNumber(value: number | string | null): number | null {
  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateSample(
  collection: IndicatorCollection,
  collectionIntervalMs: number,
): SampleCalculation {
  const gap = (
    reason: CalculationGapReason,
  ): SampleCalculation => ({
    collectionId: collection.id_collection,
    attemptedAt: collection.attempted_at,
    status: collection.status,
    energyKwh: null,
    emissionsGco2e: null,
    carbonIntensityGco2ePerKwh: null,
    gapReason: reason,
  });

  if (collection.status !== "success") {
    return gap(collection.status);
  }

  const cpuPercent = finiteNumber(collection.cpu_percent);
  const memoryGb = finiteNumber(collection.memory_gb);
  const diskGb = finiteNumber(collection.disk_gb);
  const networkGb = finiteNumber(collection.network_gb);

  if (
    cpuPercent === null ||
    cpuPercent < 0 ||
    cpuPercent > 100 ||
    memoryGb === null ||
    memoryGb < 0 ||
    diskGb === null ||
    diskGb < 0 ||
    networkGb === null ||
    networkGb < 0
  ) {
    return gap("invalid_metrics");
  }

  const powerWatts =
    (cpuPercent / 100) * POWER_MODEL.cpuMaximumWatts +
    memoryGb * POWER_MODEL.memoryWattsPerGb +
    diskGb * POWER_MODEL.diskWattsPerGb +
    networkGb * POWER_MODEL.networkWattsPerGb;
  const energyKwh =
    (powerWatts * collectionIntervalMs) / 3_600_000_000;

  const carbonIntensity = collection.carbon_intensity_gco2e_per_kwh;
  if (
    carbonIntensity === null ||
    !Number.isFinite(carbonIntensity) ||
    carbonIntensity < 0
  ) {
    return {
      collectionId: collection.id_collection,
      attemptedAt: collection.attempted_at,
      status: collection.status,
      energyKwh,
      emissionsGco2e: null,
      carbonIntensityGco2ePerKwh: null,
      gapReason: "carbon_intensity_unavailable",
    };
  }

  return {
    collectionId: collection.id_collection,
    attemptedAt: collection.attempted_at,
    status: collection.status,
    energyKwh,
    emissionsGco2e: energyKwh * carbonIntensity,
    carbonIntensityGco2ePerKwh: carbonIntensity,
    gapReason: null,
  };
}

function coveragePercent(valid: number, total: number): number {
  return total === 0 ? 0 : (valid / total) * 100;
}

export class IndicadoresService {
  constructor(
    private readonly repository: Pick<
      IndicadoresRepository,
      "findCollectionsForPeriod"
    > = new IndicadoresRepository(),
    // Provisório: não substitui collection_interval_seconds da API.
    // Trocar quando o intervalo real por amostra estiver validado e persistido.
    private readonly collectionIntervalMs = env.metricsCollectionIntervalMs,
    private readonly carbonIntensityMaxAgeMs = env.carbonIntensityMaxAgeMs,
  ) {}

  async getIndicators(startValue: string, endValue: string) {
    const start = parseDate(startValue, "start");
    const end = parseDate(endValue, "end");

    if (end <= start) {
      throw new AppError(
        "A data final deve ser posterior à data inicial",
        400,
        "INVALID_INDICATOR_PERIOD",
      );
    }

    const services = await this.repository.findCollectionsForPeriod(
      start,
      end,
      this.carbonIntensityMaxAgeMs,
    );
    const indicators = services.map((service) =>
      this.calculateServiceIndicators(service),
    );

    const collectionCount = indicators.reduce(
      (total, service) => total + service.periodTotals.collectionCount,
      0,
    );
    const validMetricCount = indicators.reduce(
      (total, service) => total + service.periodTotals.validMetricCount,
      0,
    );
    const validCarbonIntensityCount = indicators.reduce(
      (total, service) =>
        total + service.periodTotals.validCarbonIntensityCount,
      0,
    );

    return {
      period: {
        start,
        end,
        collectionIntervalMs: this.collectionIntervalMs,
      },
      powerModel: POWER_MODEL,
      summary: {
        serviceCount: indicators.length,
        activeServiceCount: indicators.filter(
          (service) => service.status === "active",
        ).length,
        energyKwh: indicators.reduce(
          (total, service) => total + service.periodTotals.energyKwh,
          0,
        ),
        emissionsGco2e: indicators.reduce(
          (total, service) => total + service.periodTotals.emissionsGco2e,
          0,
        ),
        collectionCount,
        validMetricCount,
        validCarbonIntensityCount,
        metricCoveragePercent: coveragePercent(
          validMetricCount,
          collectionCount,
        ),
        carbonIntensityCoveragePercent: coveragePercent(
          validCarbonIntensityCount,
          validMetricCount,
        ),
        isPartial:
          collectionCount === 0 ||
          validMetricCount < collectionCount ||
          validCarbonIntensityCount < validMetricCount,
      },
      services: indicators,
    };
  }

  private calculateServiceIndicators(
    service: ServiceIndicatorData,
  ): ServiceIndicators {
    const samples = service.collections.map((collection) =>
      calculateSample(collection, this.collectionIntervalMs),
    );
    const collectionCount = samples.length;
    const validMetricSamples = samples.filter(
      (sample) => sample.energyKwh !== null,
    );
    const validCarbonSamples = samples.filter(
      (sample) => sample.emissionsGco2e !== null,
    );
    const gaps = samples.flatMap((sample) =>
      sample.gapReason === null
        ? []
        : [
            {
              collectionId: sample.collectionId,
              attemptedAt: sample.attemptedAt,
              reason: sample.gapReason,
            },
          ],
    );

    return {
      serviceId: service.id_service,
      name: service.name,
      status: service.status,
      regionCode: service.region_code,
      latestSampleInPeriod: samples.at(-1) ?? null,
      periodTotals: {
        energyKwh: validMetricSamples.reduce(
          (total, sample) => total + (sample.energyKwh ?? 0),
          0,
        ),
        emissionsGco2e: validCarbonSamples.reduce(
          (total, sample) => total + (sample.emissionsGco2e ?? 0),
          0,
        ),
        collectionCount,
        validMetricCount: validMetricSamples.length,
        validCarbonIntensityCount: validCarbonSamples.length,
        metricCoveragePercent: coveragePercent(
          validMetricSamples.length,
          collectionCount,
        ),
        carbonIntensityCoveragePercent: coveragePercent(
          validCarbonSamples.length,
          validMetricSamples.length,
        ),
        isPartial:
          collectionCount === 0 ||
          validMetricSamples.length < collectionCount ||
          validCarbonSamples.length < validMetricSamples.length,
        gaps,
      },
    };
  }
}
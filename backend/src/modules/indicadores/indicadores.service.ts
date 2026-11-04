import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  IndicadoresRepository,
  type IndicatorCollection,
  type ServiceIndicatorData,
} from "./indicadores.repository.js";

// Modelo versão 1, baseado nos parâmetros do exemplo fornecido pelo cliente
// (detalhes em docs/calculos.md); são estimativas, não medições do hardware.
const POWER_MODEL = {
  version: "1",
  // Potência máxima atribuída à CPU, em watts (W).
  cpuMaximumWatts: 100,
  // Fatores de potência em watts por gigabyte (W/GB).
  memoryWattsPerGb: 0.375,
  diskWattsPerGb: 0.01,
  networkWattsPerGb: 0.02,
} as const;

type CalculationGapReason =
  | IndicatorCollection["status"]
  | "invalid_metrics"
  | "collection_interval_unavailable"
  | "carbon_intensity_unavailable";

interface CalculationGap {
  collectionId: string;
  attemptedAt: Date;
  reason: CalculationGapReason;
}

interface SampleMetrics {
  cpuPercent: number;
  memoryGb: number;
  diskGb: number;
  networkGb: number;
}

interface SampleCalculation {
  collectionId: string;
  attemptedAt: Date;
  status: IndicatorCollection["status"];
  metrics: SampleMetrics | null;
  collectionIntervalSeconds: number | null;
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

function calculateSample(collection: IndicatorCollection): SampleCalculation {
  // A duração da amostra só pode participar da conta se for finita e positiva.
  const collectionIntervalSeconds =
    typeof collection.collection_interval_seconds === "number" &&
    Number.isFinite(collection.collection_interval_seconds) &&
    collection.collection_interval_seconds > 0
      ? collection.collection_interval_seconds
      : null;

  const gap = (
    reason: CalculationGapReason,
    metrics: SampleMetrics | null = null,
  ): SampleCalculation => ({
    collectionId: collection.id_collection,
    attemptedAt: collection.attempted_at,
    status: collection.status,
    metrics,
    collectionIntervalSeconds,
    // Para status no_metrics/unavailable/error, intervalo inválido ou métricas
    // inválidas, não há energia nem emissão; os resultados e o fator ficam nulos.
    energyKwh: null,
    emissionsGco2e: null,
    carbonIntensityGco2ePerKwh: null,
    gapReason: reason,
  });

  // Tentativas sem sucesso não têm energia ou emissões calculáveis; o motivo preserva o status da coleta.
  if (collection.status !== "success") {
    return gap(collection.status);
  }

  const cpuPercent = finiteNumber(collection.cpu_percent);
  const memoryGb = finiteNumber(collection.memory_gb);
  const diskGb = finiteNumber(collection.disk_gb);
  const networkGb = finiteNumber(collection.network_gb);

  // CPU é percentual entre 0 e 100; memória, disco e rede são quantidades em
  // GB e não podem ser negativas. Valores ausentes ou não finitos são inválidos.
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
    // Requer CPU entre 0 e 100% e memória, disco e rede finitos e não negativos.
    return gap("invalid_metrics");
  }

  const metrics: SampleMetrics = {
    cpuPercent,
    memoryGb,
    diskGb,
    networkGb,
  };

  // Mantém as métricas reais na amostra mesmo quando não há intervalo válido para calcular energia.
  if (collectionIntervalSeconds === null) {
    return gap("collection_interval_unavailable", metrics);
  }

  // Potência estimada = CPU% da potência máxima + consumo estimado de memória, disco e rede.
  const powerWatts =
    // cpu_percent é uma porcentagem (0–100), convertida em fração antes de
    // multiplicar pela potência máxima de CPU expressa em watts.
    (cpuPercent / 100) * POWER_MODEL.cpuMaximumWatts +
    memoryGb * POWER_MODEL.memoryWattsPerGb +
    diskGb * POWER_MODEL.diskWattsPerGb +
    networkGb * POWER_MODEL.networkWattsPerGb;
  // W·s convertido em kWh: 3.600 s/h × 1.000 Wh/kWh = 3.600.000.
  // Potência, energia, emissões e totais são mantidos como doubles crus.
  // O intervalo usado é o registrado na própria amostra.
  const energyKwh = (powerWatts * collectionIntervalSeconds) / 3_600_000;

  const carbonIntensity = collection.carbon_intensity_gco2e_per_kwh;
  // Uma intensidade ausente/inválida impede somente a emissão; a energia já
  // calculada continua válida e é mantida na amostra.
  if (
    carbonIntensity === null ||
    !Number.isFinite(carbonIntensity) ||
    carbonIntensity < 0
  ) {
    // Energia continua disponível; sem fator regional válido, emissões e fator ficam nulos.
    return {
      collectionId: collection.id_collection,
      attemptedAt: collection.attempted_at,
      status: collection.status,
      metrics,
      collectionIntervalSeconds,
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
    metrics,
    collectionIntervalSeconds,
    energyKwh,
    // kWh × gCO₂e/kWh resulta em gramas de CO₂ equivalente (gCO₂e).
    emissionsGco2e: energyKwh * carbonIntensity,
    carbonIntensityGco2ePerKwh: carbonIntensity,
    gapReason: null,
  };
}
function coveragePercent(valid: number, total: number): number {
  // Percentual de amostras válidas sobre o denominador correspondente:
  // todas as coletas para métricas, ou métricas válidas para intensidade.
  // O resultado permanece double, sem arredondamento.
  return total === 0 ? 0 : (valid / total) * 100;
}

export class IndicadoresService {
  constructor(
    private readonly repository: Pick<
      IndicadoresRepository,
      "findCollectionsForPeriod"
    > = new IndicadoresRepository(),
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

    // Cobertura de métricas compara amostras com energia válida ao total de tentativas.
    // Cobertura de carbono compara amostras com emissões válidas às que têm métricas válidas.
    // O resumo é parcial se não houver tentativas ou se alguma dessas etapas tiver lacunas.
    return {
      period: {
        start,
        end,
        collectionIntervalMs: env.metricsCollectionIntervalMs,
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
        // Resultado parcial se não houve coletas, faltam métricas válidas ou
        // alguma amostra com energia válida não tem intensidade elegível.
        isPartial:
          collectionCount === 0 ||
          validMetricCount < collectionCount ||
          validCarbonIntensityCount < validMetricCount,
      },
      services: indicators,
    };
  }
//o método abaixo recebe serviço e período
  async getServiceHistory(
    serviceId: number,
    startValue: string,
    endValue: string,
  ) {
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      throw new AppError(
        "O identificador do serviço deve ser um número inteiro positivo",
        400,
        "INVALID_SERVICE_ID",
      );
    }

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
      serviceId,
    );

    const service = services[0];
    if (!service) {
      throw new AppError("Serviço não encontrado", 404, "SERVICE_NOT_FOUND");
    }
    const samples = service.collections.map((collection) =>
      calculateSample(collection),
    );

    return {
      period: {
        start,
        end,
        collectionIntervalMs: env.metricsCollectionIntervalMs,
      },
      service: {
        serviceId: service.id_service,
        name: service.name,
        status: service.status,
        regionCode: service.region_code,
      },
      samples,
    };
  }

  private calculateServiceIndicators(
    service: ServiceIndicatorData,
  ): ServiceIndicators {
    const samples = service.collections.map((collection) =>
      calculateSample(collection),
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
        // As coberturas usam os mesmos denominadores do resumo: tentativas e métricas válidas, respectivamente.
        metricCoveragePercent: coveragePercent(
          validMetricSamples.length,
          collectionCount,
        ),
        carbonIntensityCoveragePercent: coveragePercent(
          validCarbonSamples.length,
          validMetricSamples.length,
        ),
        // Os totais e percentuais permanecem doubles crus, sem arredondamento.
        isPartial:
          // Não houve coleta no período, faltam métricas válidas ou faltam fatores de carbono para métricas válidas.
          collectionCount === 0 ||
          validMetricSamples.length < collectionCount ||
          validCarbonSamples.length < validMetricSamples.length,
        gaps,
      },
    };
  }
}

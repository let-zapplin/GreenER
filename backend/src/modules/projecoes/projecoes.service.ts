import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { IndicadoresService } from "../indicadores/indicadores.service.js";
import {
  ProjecoesRepository,
  type ProjectionRegionSnapshot,
} from "./projecoes.repository.js";

const MAX_PROJECTION_REGIONS = 4;

export interface LocationProjectionScenario {
  regionCode: string;
  country: string;
  region: string;
  city: string | null;

  latitude: number | null;
  longitude: number | null;

  carbonIntensityGco2ePerKwh: number;
  renewableSharePercent: number;

  projectedEmissionsGco2e: number | null;

  differenceGco2e: number | null;
  differencePercent: number | null;

  isCurrent: boolean;

  snapshotRegisteredAt: Date;
}

export interface LocationProjectionResult {
  service: {
    serviceId: number;
    name: string;
    currentRegionCode: string;
  };

  period: {
    start: string;
    end: string;
  };

  energyKwh: number | null;

  validEnergySampleCount: number;
  totalSampleCount: number;

  isPartial: boolean;

  scenarios: LocationProjectionScenario[];

  unavailableRegionCodes: string[];
}

export interface ServiceRedistributionAllocation {
  serviceId: number;
  name: string;
  currentRegionCode: string;
  assignedRegionCode: string;
  energyKwh: number | null;
  validEnergySampleCount: number;
  observedEmissionsGco2e: number | null;
  validObservedEmissionSampleCount: number;
  totalSampleCount: number;
  isPartial: boolean;
  projectedEmissionsGco2e: number | null;
}

export interface ServiceRedistributionRegion {
  regionCode: string;
  serviceCount: number;
  carbonIntensityGco2ePerKwh: number;
  renewableSharePercent: number;
  snapshotRegisteredAt: Date;
}

export type ServiceRedistributionPolicy =
  | "preserve_current_counts"
  | "balanced"
  | "unconstrained";

export interface ServiceRedistributionResult {
  period: {
    start: string;
    end: string;
  };
  occupancyPolicy: ServiceRedistributionPolicy;
  requireServicePerRegion: boolean;
  allocations: ServiceRedistributionAllocation[];
  regions: ServiceRedistributionRegion[];
  knownProjectedEmissionsGco2e: number;
  isPartial: boolean;
  unavailableRegionCodes: string[];
}

function isServiceRedistributionPolicy(
  value: unknown,
): value is ServiceRedistributionPolicy {
  return (
    value === "preserve_current_counts" ||
    value === "balanced" ||
    value === "unconstrained"
  );
}

interface EnergyBearingService {
  serviceId: number;
  energyKwh: number;
}

type ProjectionIndicatorsService = Pick<
  IndicadoresService,
  "getServiceHistory"
> &
  Partial<Pick<IndicadoresService, "getIndicators">>;

export class ProjecoesService {
  constructor(
    private readonly indicadoresService: ProjectionIndicatorsService =
      new IndicadoresService(),

    private readonly repository: Pick<
      ProjecoesRepository,
      "findLatestRegionalSnapshots" | "listAvailableRegions"
    > = new ProjecoesRepository(),
    private readonly carbonIntensityMaxAgeMs = env.carbonIntensityMaxAgeMs,
  ) {}

  async projectLocation(
    serviceId: number,
    start: string,
    end: string,
    regionCodes: string[],
  ): Promise<LocationProjectionResult> {
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      throw new AppError(
        "O identificador do serviço deve ser um número inteiro positivo",
        400,
        "INVALID_PROJECTION_SERVICE_ID",
      );
    }

    const normalizedRegionCodes = this.normalizeRegionCodes(regionCodes);

    /*
     * Reutilizamos o histórico calculado pelo módulo de indicadores.
     *
     * Dessa forma, a projeção não cria uma segunda implementação
     * para o cálculo energético.
     */
    const history = await this.indicadoresService.getServiceHistory(
      serviceId,
      start,
      end,
    );

    const validEnergySamples = history.samples.filter(
      (sample) => sample.energyKwh !== null,
    );

    /*
     * Na ausência completa de amostras calculáveis, energia permanece null.
     *
     * Isso evita interpretar ausência de informação como consumo zero.
     */
    const energyKwh =
      validEnergySamples.length === 0
        ? null
        : validEnergySamples.reduce(
            (total, sample) => total + (sample.energyKwh ?? 0),
            0,
          );

    const currentRegionCode = history.service.regionCode;

    /*
     * A localização atual sempre participa da comparação.
     *
     * Caso ela também tenha sido selecionada manualmente,
     * o Set impede duplicação.
     */
    const allRegionCodes = [currentRegionCode, ...normalizedRegionCodes];

    const uniqueRegionCodes = [...new Set(allRegionCodes)];

    const regionalSnapshots =
      await this.repository.findLatestRegionalSnapshots(uniqueRegionCodes);

    const snapshotsByRegion = new Map(
      regionalSnapshots.map((snapshot) => [snapshot.regionCode, snapshot]),
    );

    const currentSnapshot = snapshotsByRegion.get(currentRegionCode);

    const currentProjectedEmissions =
      currentSnapshot && energyKwh !== null
        ? this.calculateProjectedEmissions(energyKwh, currentSnapshot)
        : null;

    const scenarios = uniqueRegionCodes.flatMap(
      (regionCode): LocationProjectionScenario[] => {
        const snapshot = snapshotsByRegion.get(regionCode);

        if (!snapshot) {
          return [];
        }

        const projectedEmissionsGco2e =
          energyKwh === null
            ? null
            : this.calculateProjectedEmissions(energyKwh, snapshot);

        const differenceGco2e =
          projectedEmissionsGco2e !== null && currentProjectedEmissions !== null
            ? projectedEmissionsGco2e - currentProjectedEmissions
            : null;

        const differencePercent =
          differenceGco2e !== null &&
          currentProjectedEmissions !== null &&
          currentProjectedEmissions > 0
            ? (differenceGco2e / currentProjectedEmissions) * 100
            : null;

        return [
          {
            regionCode: snapshot.regionCode,
            country: snapshot.country,
            region: snapshot.region,
            city: snapshot.city,

            latitude: snapshot.latitude,
            longitude: snapshot.longitude,

            carbonIntensityGco2ePerKwh: snapshot.carbonIntensityGco2ePerKwh,

            renewableSharePercent: snapshot.renewableSharePercent,

            projectedEmissionsGco2e,

            differenceGco2e,
            differencePercent,

            isCurrent: snapshot.regionCode === currentRegionCode,

            snapshotRegisteredAt: snapshot.registeredAt,
          },
        ];
      },
    );

    const unavailableRegionCodes = uniqueRegionCodes.filter(
      (regionCode) => !snapshotsByRegion.has(regionCode),
    );

    return {
      service: {
        serviceId: history.service.serviceId,
        name: history.service.name,
        currentRegionCode,
      },

      period: {
        start,
        end,
      },

      energyKwh,

      validEnergySampleCount: validEnergySamples.length,
      totalSampleCount: history.samples.length,

      isPartial: validEnergySamples.length !== history.samples.length,

      scenarios,

      unavailableRegionCodes,
    };
  }

  async redistributeServices(
    start: string,
    end: string,
    policyValue: ServiceRedistributionPolicy | boolean,
  ): Promise<ServiceRedistributionResult> {
    const occupancyPolicy =
      typeof policyValue === "boolean"
        ? policyValue
          ? "balanced"
          : "unconstrained"
        : policyValue;

    if (!isServiceRedistributionPolicy(occupancyPolicy)) {
      throw new AppError(
        "Informe uma política válida de ocupação regional",
        400,
        "INVALID_REDISTRIBUTION_CONSTRAINT",
      );
    }

    const getIndicators = this.indicadoresService.getIndicators;
    if (!getIndicators) {
      throw new AppError(
        "A agregação de indicadores não está disponível",
        500,
        "REDISTRIBUTION_DATA_UNAVAILABLE",
      );
    }

    const [indicators, regionalSnapshots] = await Promise.all([
      getIndicators.call(this.indicadoresService, start, end),
      this.repository.listAvailableRegions(),
    ]);

    const now = Date.now();
    const freshRegions = regionalSnapshots
      .filter((snapshot) => {
        const ageMs = now - snapshot.registeredAt.getTime();
        return (
          ageMs >= 0 &&
          ageMs <= this.carbonIntensityMaxAgeMs &&
          Number.isFinite(snapshot.carbonIntensityGco2ePerKwh) &&
          snapshot.carbonIntensityGco2ePerKwh >= 0
        );
      })
      .sort((left, right) => left.regionCode.localeCompare(right.regionCode));

    if (freshRegions.length === 0) {
      throw new AppError(
        "Não há regiões com intensidade de carbono atualizada disponível",
        503,
        "NO_FRESH_REDISTRIBUTION_REGIONS",
      );
    }

    const freshRegionCodes = new Set(
      freshRegions.map((region) => region.regionCode),
    );
    const unavailableRegionCodes = regionalSnapshots
      .filter((snapshot) => !freshRegionCodes.has(snapshot.regionCode))
      .map((snapshot) => snapshot.regionCode)
      .sort((left, right) => left.localeCompare(right));

    const activeServices = indicators.services
      .filter((service) => service.status === "active")
      .sort((left, right) => left.serviceId - right.serviceId);

    const fixedAllocations: ServiceRedistributionAllocation[] = [];
    const fixedRegionCounts = new Map(
      freshRegions.map((region) => [region.regionCode, 0]),
    );
    const currentRegionCounts = new Map<string, number>();
    const energyBearingServices: EnergyBearingService[] = [];
    const serviceById = new Map<
      number,
      (typeof activeServices)[number]
    >();

    for (const service of activeServices) {
      serviceById.set(service.serviceId, service);
      currentRegionCounts.set(
        service.regionCode,
        (currentRegionCounts.get(service.regionCode) ?? 0) + 1,
      );
      const { energyKwh, validMetricCount, collectionCount } =
        service.periodTotals;

      if (validMetricCount === 0) {
        fixedAllocations.push({
          serviceId: service.serviceId,
          name: service.name,
          currentRegionCode: service.regionCode,
          assignedRegionCode: service.regionCode,
          energyKwh: null,
          validEnergySampleCount: 0,
          observedEmissionsGco2e: null,
          validObservedEmissionSampleCount: 0,
          totalSampleCount: collectionCount,
          isPartial: true,
          projectedEmissionsGco2e: null,
        });

        if (freshRegionCodes.has(service.regionCode)) {
          fixedRegionCounts.set(
            service.regionCode,
            (fixedRegionCounts.get(service.regionCode) ?? 0) + 1,
          );
        }

        continue;
      }

      if (!Number.isFinite(energyKwh) || energyKwh < 0) {
        throw new AppError(
          "O agregado de energia contém um valor inválido",
          500,
          "INVALID_REDISTRIBUTION_ENERGY",
        );
      }

      energyBearingServices.push({
        serviceId: service.serviceId,
        energyKwh,
      });
    }

    const hasCurrentServicesInUnavailableRegions = [
      ...currentRegionCounts.keys(),
    ].some((regionCode) => !freshRegionCodes.has(regionCode));
    const hasFixedServicesInUnavailableRegions = fixedAllocations.some(
      (allocation) => !freshRegionCodes.has(allocation.currentRegionCode),
    );

    if (
      (occupancyPolicy === "preserve_current_counts" &&
        hasCurrentServicesInUnavailableRegions) ||
      (occupancyPolicy === "balanced" &&
        hasFixedServicesInUnavailableRegions)
    ) {
      throw new AppError(
        "Não é possível cumprir a política de ocupação com as regiões elegíveis e os serviços fixos",
        422,
        "REDISTRIBUTION_INFEASIBLE",
      );
    }

    const targetRegionCounts =
      occupancyPolicy === "preserve_current_counts"
        ? new Map(
            freshRegions.map((region) => [
              region.regionCode,
              currentRegionCounts.get(region.regionCode) ?? 0,
            ]),
          )
        : null;

    const assignedRegionByService = this.findOptimalAssignments(
      energyBearingServices,
      freshRegions,
      fixedRegionCounts,
      occupancyPolicy,
      targetRegionCounts,
      activeServices.length,
    );

    if (!assignedRegionByService) {
      throw new AppError(
        "Não é possível cumprir a política de ocupação escolhida",
        422,
        "REDISTRIBUTION_INFEASIBLE",
      );
    }

    const regionByCode = new Map(
      freshRegions.map((region) => [region.regionCode, region]),
    );
    const movableAllocations = energyBearingServices.map((service) => {
      const indicator = serviceById.get(service.serviceId);
      const assignedRegionCode = assignedRegionByService.get(service.serviceId);
      const region = assignedRegionCode
        ? regionByCode.get(assignedRegionCode)
        : undefined;

      if (!indicator || !assignedRegionCode || !region) {
        throw new AppError(
          "A otimização não produziu uma alocação completa",
          500,
          "REDISTRIBUTION_ASSIGNMENT_INCOMPLETE",
        );
      }

      const { validMetricCount, collectionCount } = indicator.periodTotals;
      const validObservedEmissionSampleCount =
        indicator.periodTotals.validCarbonIntensityCount;
      return {
        serviceId: indicator.serviceId,
        name: indicator.name,
        currentRegionCode: indicator.regionCode,
        assignedRegionCode,
        energyKwh: service.energyKwh,
        validEnergySampleCount: validMetricCount,
        observedEmissionsGco2e:
          validObservedEmissionSampleCount === 0
            ? null
            : indicator.periodTotals.emissionsGco2e,
        validObservedEmissionSampleCount,
        totalSampleCount: collectionCount,
        isPartial: validMetricCount < collectionCount,
        projectedEmissionsGco2e:
          service.energyKwh * region.carbonIntensityGco2ePerKwh,
      };
    });

    const allocations = [...fixedAllocations, ...movableAllocations].sort(
      (left, right) => left.serviceId - right.serviceId,
    );
    const finalRegionCounts = new Map(
      freshRegions.map((region) => [region.regionCode, 0]),
    );
    for (const allocation of allocations) {
      if (freshRegionCodes.has(allocation.assignedRegionCode)) {
        finalRegionCounts.set(
          allocation.assignedRegionCode,
          (finalRegionCounts.get(allocation.assignedRegionCode) ?? 0) + 1,
        );
      }
    }

    return {
      period: {
        start: indicators.period.start.toISOString(),
        end: indicators.period.end.toISOString(),
      },
      occupancyPolicy,
      requireServicePerRegion: freshRegions.every(
        (region) => (finalRegionCounts.get(region.regionCode) ?? 0) > 0,
      ),
      allocations,
      regions: freshRegions.map((region) => ({
        regionCode: region.regionCode,
        serviceCount: finalRegionCounts.get(region.regionCode) ?? 0,
        carbonIntensityGco2ePerKwh:
          region.carbonIntensityGco2ePerKwh,
        renewableSharePercent: region.renewableSharePercent,
        snapshotRegisteredAt: region.registeredAt,
      })),
      knownProjectedEmissionsGco2e: allocations.reduce(
        (total, allocation) =>
          total + (allocation.projectedEmissionsGco2e ?? 0),
        0,
      ),
      isPartial: allocations.some(
        (allocation) =>
          allocation.isPartial ||
          allocation.validObservedEmissionSampleCount <
            allocation.totalSampleCount,
      ),
      unavailableRegionCodes,
    };
  }

  async listAvailableRegions() {
    const regions =
     await this.repository.listAvailableRegions();

    return regions.map((region) => ({
      regionCode: region.regionCode,

      country: region.country,
      region: region.region,
      city: region.city,

      latitude: region.latitude,
      longitude: region.longitude,

      carbonIntensityGco2ePerKwh: region.carbonIntensityGco2ePerKwh,

      renewableSharePercent: region.renewableSharePercent,

      snapshotRegisteredAt: region.registeredAt,
    }));
  }

  private normalizeRegionCodes(regionCodes: string[]): string[] {
    if (!Array.isArray(regionCodes)) {
      throw new AppError(
        "Informe as regiões utilizadas na projeção",
        400,
        "INVALID_PROJECTION_REGIONS",
      );
    }

    const normalized = [
      ...new Set(
        regionCodes
          .filter(
            (regionCode): regionCode is string =>
              typeof regionCode === "string",
          )
          .map((regionCode) => regionCode.trim())
          .filter((regionCode) => regionCode.length > 0),
      ),
    ];

    if (normalized.length === 0) {
      throw new AppError(
        "Selecione pelo menos uma região para projeção",
        400,
        "INVALID_PROJECTION_REGIONS",
      );
    }

    if (normalized.length > MAX_PROJECTION_REGIONS) {
      throw new AppError(
        `Selecione no máximo ${MAX_PROJECTION_REGIONS} regiões para projeção`,
        400,
        "PROJECTION_REGION_LIMIT_EXCEEDED",
      );
    }

    return normalized;
  }

  private findOptimalAssignments(
    services: EnergyBearingService[],
    regions: ProjectionRegionSnapshot[],
    initialRegionCounts: Map<string, number>,
    policy: ServiceRedistributionPolicy,
    targetRegionCounts: Map<string, number> | null,
    totalActiveServiceCount: number,
  ): Map<number, string> | null {
    const assignments = new Map<number, string>();

    if (policy === "unconstrained") {
      for (const service of services) {
        const bestRegion = regions.reduce((best, region) =>
          region.carbonIntensityGco2ePerKwh <
          best.carbonIntensityGco2ePerKwh
            ? region
            : best,
        );
        assignments.set(service.serviceId, bestRegion.regionCode);
      }

      return assignments;
    }

    const minimumServicesPerRegion =
      policy === "balanced"
        ? Math.floor(totalActiveServiceCount / regions.length)
        : 0;
    const maximumServicesPerRegion =
      policy === "balanced"
        ? Math.ceil(totalActiveServiceCount / regions.length)
        : Number.POSITIVE_INFINITY;
    if (
      policy === "preserve_current_counts" &&
      (!targetRegionCounts ||
        [...targetRegionCounts.values()].reduce(
          (total, count) => total + count,
          0,
        ) !== totalActiveServiceCount)
    ) {
      return null;
    }

    const regionCounts = new Map(initialRegionCounts);
    const bestAssignments = new Map<number, string>();
    let bestEmissions = Number.POSITIVE_INFINITY;
    
    // Keep the recursive search while the expected service and region counts stay small.
    // Revisit this approach if the redistribution workload grows.
    const search = (serviceIndex: number, projectedEmissions: number) => {
      if (projectedEmissions >= bestEmissions) {
        return;
      }

      const remainingServices = services.length - serviceIndex;
      if (policy === "preserve_current_counts") {
        let requiredAssignments = 0;
        for (const region of regions) {
          const targetCount = targetRegionCounts?.get(region.regionCode) ?? 0;
          const assignedCount = regionCounts.get(region.regionCode) ?? 0;
          if (assignedCount > targetCount) {
            return;
          }
          requiredAssignments += targetCount - assignedCount;
        }
        if (requiredAssignments !== remainingServices) {
          return;
        }
      } else {
        let minimumAssignments = 0;
        let remainingCapacity = 0;
        for (const region of regions) {
          const assignedCount = regionCounts.get(region.regionCode) ?? 0;
          minimumAssignments += Math.max(
            0,
            minimumServicesPerRegion - assignedCount,
          );
          remainingCapacity += maximumServicesPerRegion - assignedCount;
        }
        if (
          minimumAssignments > remainingServices ||
          remainingCapacity < remainingServices
        ) {
          return;
        }
      }

      if (serviceIndex === services.length) {
        if (
          policy === "preserve_current_counts" &&
          regions.some(
            (region) =>
              regionCounts.get(region.regionCode) !==
              targetRegionCounts?.get(region.regionCode),
          )
        ) {
          return;
        }
        if (
          policy === "balanced" &&
          regions.some((region) => {
            const count = regionCounts.get(region.regionCode) ?? 0;
            return (
              count < minimumServicesPerRegion ||
              count > maximumServicesPerRegion
            );
          })
        ) {
          return;
        }

        bestEmissions = projectedEmissions;
        bestAssignments.clear();
        for (const [serviceId, regionCode] of assignments) {
          bestAssignments.set(serviceId, regionCode);
        }
        return;
      }

      const service = services[serviceIndex];
      for (const region of regions) {
        const assignedCount = regionCounts.get(region.regionCode) ?? 0;
        const regionCapacity =
          policy === "preserve_current_counts"
            ? targetRegionCounts?.get(region.regionCode) ?? 0
            : maximumServicesPerRegion;
        if (assignedCount >= regionCapacity) {
          continue;
        }

        regionCounts.set(
          region.regionCode,
          assignedCount + 1,
        );
        assignments.set(service.serviceId, region.regionCode);
        //RECURSÃO
        search(
          serviceIndex + 1,
          projectedEmissions +
            service.energyKwh * region.carbonIntensityGco2ePerKwh,
        );
        assignments.delete(service.serviceId);
        regionCounts.set(
          region.regionCode,
          (regionCounts.get(region.regionCode) ?? 1) - 1,
        );
      }
    };

    search(0, 0);
    return Number.isFinite(bestEmissions) ? bestAssignments : null;
  }

  private calculateProjectedEmissions(
    energyKwh: number,
    snapshot: ProjectionRegionSnapshot,
  ): number {
    return energyKwh * snapshot.carbonIntensityGco2ePerKwh;
  }
}

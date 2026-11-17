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

export class ProjecoesService {
  constructor(
    private readonly indicadoresService: Pick<
      IndicadoresService,
      "getServiceHistory"
    > = new IndicadoresService(),

    private readonly repository: Pick<
      ProjecoesRepository,
      "findLatestRegionalSnapshots" | "listAvailableRegions"
    > = new ProjecoesRepository(),
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

  private calculateProjectedEmissions(
    energyKwh: number,
    snapshot: ProjectionRegionSnapshot,
  ): number {
    return energyKwh * snapshot.carbonIntensityGco2ePerKwh;
  }
}

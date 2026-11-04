import { env } from "../../config/env.js";
import { fetchCarbonRegions } from "../../integrations/carbon-api.js";
import { IntensidadesRepository } from "./intensidades.repository.js";

export interface ExternalIntensity {
  regionCode: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number;
  longitude: number;
  carbonIntensity: number;
  renewableShare: number;
}

export class IntensidadesService {
  private readonly repository: IntensidadesRepository;

  constructor() {
    this.repository = new IntensidadesRepository();
  }

  async discoverIntensities(): Promise<ExternalIntensity[]> {
    const { regions } = await fetchCarbonRegions();

    return regions.map((item) => ({
      regionCode: item.code,
      country: item.country,
      region: item.region,
      city: item.city ?? null,
      latitude: item.latitude,
      longitude: item.longitude,
      carbonIntensity: item.carbon_intensity_gco2e_per_kwh,
      renewableShare: item.renewable_share_percent,
    }));
  }

  async saveIntensity(): Promise<{
    inserted: number;
  }> {
    const intensities = await this.discoverIntensities();
    // Um único instante mantém o lote coerente: todos os snapshots desta
    // execução compartilham o mesmo registered_at.
    const registeredAt = new Date();

    for (const intensity of intensities) {
      // Reutiliza a localização regional canônica (city IS NULL); só cria uma
      // localização nova se ainda não existir para esse region_code.
      let location = await this.repository.findLocationByRegion(
        intensity.regionCode,
      );

      if (!location) {
        location = await this.repository.createLocation({
          regionCode: intensity.regionCode,
          country: intensity.country,
          region: intensity.region,
          city: null,
          latitude: intensity.latitude,
          longitude: intensity.longitude,
        });
      }

      await this.repository.createCarbonIntensity({
        idLocation: location.id_location,
        carbonIntensity: intensity.carbonIntensity,
        renewableShare: intensity.renewableShare,
        registeredAt,
      });
    }

    return { inserted: intensities.length };
  }
  async listAll() {
    return this.repository.listAllIntensities();
  }

  async findIntensityForCollection(collectionId: string) {
    return this.repository.findForCollection(
      collectionId,
      env.carbonIntensityMaxAgeMs,
    );
  }
}

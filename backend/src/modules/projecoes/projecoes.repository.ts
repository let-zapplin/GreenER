//receber códigos de regiões e buscar o snapshot mais recente de intensidade de carbono de cada uma.

import pool from "../../db/connection.js";

export interface ProjectionRegionSnapshot {
  regionCode: string;
  country: string;
  region: string;
  city: string | null;

  latitude: number | null;
  longitude: number | null;

  carbonIntensityGco2ePerKwh: number;
  renewableSharePercent: number;

  registeredAt: Date;
}

interface ProjectionRegionRow {
  region_code: string;
  country: string;
  region: string;
  city: string | null;

  latitude: number | null;
  longitude: number | null;

  carbon_intensity_gco2e_per_kwh: number;
  renewable_share_percent: number;

  registered_at: Date;
}

export class ProjecoesRepository {
  async findLatestRegionalSnapshots(
    regionCodes: string[],
  ): Promise<ProjectionRegionSnapshot[]> {
    if (regionCodes.length === 0) {
      return [];
    }

    const result = await pool.query<ProjectionRegionRow>(
      `
      SELECT DISTINCT ON (l.region_code)
        l.region_code,
        l.country,
        l.region,
        l.city,
        l.latitude,
        l.longitude,
        c.carbon_intensity_gco2e_per_kwh,
        c.renewable_share_percent,
        c.registered_at
      FROM carbon_intensity c
      INNER JOIN location l
        ON l.id_location = c.location_id_location
      WHERE l.region_code = ANY($1::text[])
      ORDER BY
        l.region_code,
        c.registered_at DESC,
        c.id_carbon_intensity DESC
      `,
      [regionCodes],
    );

    return result.rows.map((row) => ({
      regionCode: row.region_code,
      country: row.country,
      region: row.region,
      city: row.city,

      latitude: row.latitude,
      longitude: row.longitude,

      carbonIntensityGco2ePerKwh: Number(
        row.carbon_intensity_gco2e_per_kwh,
      ),

      renewableSharePercent: Number(
        row.renewable_share_percent,
      ),

      registeredAt: row.registered_at,
    }));
  }
}
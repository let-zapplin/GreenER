import pool from "../../db/connection.js";

export type IndicatorCollectionStatus =
  | "success"
  | "no_metrics"
  | "unavailable"
  | "error";

export interface IndicatorCollection {
  id_collection: string;
  status: IndicatorCollectionStatus;
  attempted_at: Date;
  id_metrics: string | null;
  recorded_at: Date | null;
  cpu_percent: string | number | null;
  memory_gb: number | null;
  disk_gb: number | null;
  network_gb: number | null;
  collection_interval_seconds: number | null;
  carbon_intensity_id: number | null;
  carbon_intensity_gco2e_per_kwh: number | null;
}

export interface ServiceIndicatorData {
  id_service: number;
  name: string;
  status: string;
  region_code: string;
  collections: IndicatorCollection[];
}

interface IndicatorRow {
  id_service: number;
  name: string;
  status: string;
  region_code: string;
  id_collection: string | null;
  collection_status: IndicatorCollectionStatus | null;
  attempted_at: Date | null;
  id_metrics: string | null;
  recorded_at: Date | null;
  cpu_percent: string | number | null;
  memory_gb: number | null;
  disk_gb: number | null;
  network_gb: number | null;
  collection_interval_seconds: number | null;
  carbon_intensity_id: number | null;
  carbon_intensity_gco2e_per_kwh: number | null;
}

export class IndicadoresRepository {
  async findCollectionsForPeriod(
    start: Date,
    end: Date,
    carbonIntensityMaxAgeMs: number | undefined,
  ): Promise<ServiceIndicatorData[]> {
    const result = await pool.query<IndicatorRow>(
      `SELECT
         s.id_service,
         s.name,
         s.status,
         service_location.region_code,
         c.id_collection,
         c.status AS collection_status,
         c.attempted_at,
         m.id_metrics,
         m.recorded_at,
         m.cpu_percent,
         m.memory_gb,
         m.disk_gb,
         m.network_gb,
         m.collection_interval_seconds,
         intensity.id_carbon_intensity AS carbon_intensity_id,
         intensity.carbon_intensity_gco2e_per_kwh
       FROM service s
       INNER JOIN location service_location
         ON service_location.id_location = s.location_id_location
       LEFT JOIN collection c
         ON c.service_id_service = s.id_service
        AND c.attempted_at >= $1
        AND c.attempted_at < $2
       LEFT JOIN metrics m
         ON m.collection_id_collection = c.id_collection
       LEFT JOIN LATERAL (
         SELECT
           ci.id_carbon_intensity,
           ci.carbon_intensity_gco2e_per_kwh
         FROM carbon_intensity ci
         INNER JOIN location intensity_location
           ON intensity_location.id_location = ci.location_id_location
         WHERE intensity_location.region_code = service_location.region_code
           AND ci.registered_at <= c.attempted_at
           AND $3::double precision IS NOT NULL
           AND ci.registered_at >= c.attempted_at
             - ($3::double precision * INTERVAL '1 millisecond')
         ORDER BY ci.registered_at DESC, ci.id_carbon_intensity DESC
         LIMIT 1
       ) intensity ON m.id_metrics IS NOT NULL
       ORDER BY s.id_service, c.attempted_at, c.id_collection`,
      [start, end, carbonIntensityMaxAgeMs ?? null],
    );

    const services = new Map<number, ServiceIndicatorData>();

    for (const row of result.rows) {
      let service = services.get(row.id_service);
      if (!service) {
        service = {
          id_service: row.id_service,
          name: row.name,
          status: row.status,
          region_code: row.region_code,
          collections: [],
        };
        services.set(row.id_service, service);
      }

      if (
        row.id_collection === null ||
        row.collection_status === null ||
        row.attempted_at === null
      ) {
        continue;
      }

      service.collections.push({
        id_collection: row.id_collection,
        status: row.collection_status,
        attempted_at: row.attempted_at,
        id_metrics: row.id_metrics,
        recorded_at: row.recorded_at,
        cpu_percent: row.cpu_percent,
        memory_gb: row.memory_gb,
        disk_gb: row.disk_gb,
        network_gb: row.network_gb,
        collection_interval_seconds: row.collection_interval_seconds,
        carbon_intensity_id: row.carbon_intensity_id,
        carbon_intensity_gco2e_per_kwh:
          row.carbon_intensity_gco2e_per_kwh,
      });
    }

    return [...services.values()];
  }
}
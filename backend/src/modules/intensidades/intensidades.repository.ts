import pool from "../../db/connection.js";
import { LocalidadesRepository } from "../localidades/localidades.repository.js";

// ============================================================
// CLASSE: IntensidadesRepository
// Responsabilidade: Acesso ao banco de dados (SQL puro)
// ============================================================
export class IntensidadesRepository extends LocalidadesRepository {
  async findLocationByRegion(regionCode: string) {
    const result = await pool.query(
      `SELECT * FROM location
       WHERE region_code = $1
         AND city IS NULL
       ORDER BY id_location
       LIMIT 1`,
      [regionCode],
    );
    return result.rows[0] ?? null;
  }

  // Busca o snapshot mais recente pelo código regional.
  async findByCode(code: string) {
    const result = await pool.query(
      `SELECT c.*, l.region_code
       FROM carbon_intensity c
       INNER JOIN location l ON l.id_location = c.location_id_location
       WHERE l.region_code = $1
       ORDER BY c.registered_at DESC, c.id_carbon_intensity DESC
       LIMIT 1`,
      [code],
    );
    return result.rows[0] ?? null;
  }

  async findForCollection(collectionId: string, maxAgeMs?: number) {
    if (maxAgeMs === undefined || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
      return null;
    }

    const result = await pool.query(
      `SELECT
       c.id_carbon_intensity,
       c.location_id_location,
       c.carbon_intensity_gco2e_per_kwh,
       c.renewable_share_percent,
       c.registered_at,
      factor_location.region_code,
      factor_location.country,
      factor_location.region,
      factor_location.city,
      factor_location.latitude,
      factor_location.longitude
     FROM collection co
     INNER JOIN service s
       ON s.id_service = co.service_id_service
     INNER JOIN location service_location
       ON service_location.id_location = s.location_id_location
     INNER JOIN location factor_location
       ON factor_location.region_code = service_location.region_code
     INNER JOIN carbon_intensity c
       ON c.location_id_location = factor_location.id_location
     WHERE co.id_collection = $1
       AND c.registered_at <= co.attempted_at
       AND c.registered_at >=
         co.attempted_at - ($2::double precision * INTERVAL '1 millisecond')
     ORDER BY
       c.registered_at DESC,
       c.id_carbon_intensity DESC
     LIMIT 1`,
      [collectionId, maxAgeMs],
    );

    return result.rows[0] ?? null;
  }

  // Cria um snapshot imutável do fator regional.
  async createCarbonIntensity(data: {
    idLocation: number;
    carbonIntensity: number;
    renewableShare: number;
    registeredAt: Date;
  }) {
    const result = await pool.query(
      `INSERT INTO carbon_intensity
       (
         location_id_location,
         carbon_intensity_gco2e_per_kwh,
         renewable_share_percent,
         registered_at
       )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        data.idLocation,
        data.carbonIntensity,
        data.renewableShare,
        data.registeredAt,
      ],
    );

    return result.rows[0];
  }

  // Lista o histórico com os metadados da região.
  async listAllIntensities() {
    const result = await pool.query(
      `SELECT 
          c.id_carbon_intensity,
          c.carbon_intensity_gco2e_per_kwh,
          c.renewable_share_percent,
          c.registered_at,
          l.region_code,
          l.country,
          l.region,
          l.city,
          l.latitude,
          l.longitude
       FROM carbon_intensity c
       INNER JOIN location l ON l.id_location = c.location_id_location
      ORDER BY l.region, c.registered_at DESC, c.id_carbon_intensity DESC`,
    );
    return result.rows;
  }
}

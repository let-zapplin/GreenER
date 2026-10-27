import pool from "../../db/connection.js";
import { LocalidadesRepository } from "../localidades/localidades.repository.js";

// ============================================================
// CLASSE: IntensidadesRepository
// Responsabilidade: Acesso ao banco de dados (SQL puro)
// ============================================================
export class IntensidadesRepository extends LocalidadesRepository {
  // Buscar Carbon Region por ID externo
  async findByCode(code: string) {
    const result = await pool.query(
      `SELECT * FROM carbon_intensity c
      INNER JOIN location l
      ON l.id_location = c.location_id_location
      WHERE region_code = $1
      ORDER BY registered_at DESC
      LIMIT 1`,
      [code],
    );
    return result.rows[0] ?? null;
  }

  // Criar novo service
  async createCarbonIntensity(data: {
    idLocation: number;
    carbonIntensity: number;
    renewableShare: number;
  }) {
    const result = await pool.query(
      `INSERT INTO carbon_intensity
       (
         location_id_location,
         carbon_intensity_gco2e_per_kwh,
         renewable_share_percent,
         registered_at
       )
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `,
      [
        data.idLocation,
        data.carbonIntensity,
        data.renewableShare,
      ],
    );

    return result.rows[0];
  }

  // ========================================================
  // US03: Listar todos os serviços
  // ========================================================
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
       ORDER BY l.region`,
    );
    return result.rows;
  }
}
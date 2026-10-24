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
    idCarbon: number;
    idLocation: number;
    carbonIntensity: number;
    renewableShare: number;
  }) {
    const result = await pool.query(
      `INSERT INTO carbon_intensity
       (
         id_carbon_intensity,
         location_id_location,
         carbon_intensity_gco2e_per_kwh,
         renewable_share_percent,
         registered_at
       )
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `,
      [
        data.idCarbon,
        data.idLocation,
        data.carbonIntensity,
        data.renewableShare,
      ],
    );

    return result.rows[0];
  }

  // Atualizar service existente
  async updateService(data: { id: string; name: string; locationId: number }) {
    await pool.query(
      `UPDATE service
     SET
       name = $1,
       location_id_location = $2,
       status = 'active',
       last_seen_at = NOW()
     WHERE id = $3`,
      [data.name, data.locationId, data.id],
    );
  }

  async markUnavailableExcept(activeExternalIds: string[]): Promise<number> {
    if (activeExternalIds.length === 0) {
      const result = await pool.query(
        `UPDATE service
       SET status = 'unavailable'
       WHERE status <> 'unavailable'`,
      );

      return result.rowCount ?? 0;
    }

    const result = await pool.query(
      `UPDATE service
     SET status = 'unavailable'
     WHERE
       id <> ALL($1::text[])
       AND status <> 'unavailable'`,
      [activeExternalIds],
    );

    return result.rowCount ?? 0;
  }

  // ========================================================
  // US03: Listar todos os serviços
  // ========================================================
  async listAll() {
    const result = await pool.query(
      `SELECT 
          s.id_service,
          s.id AS external_id,
          s.name,
          s.status,
          s.last_seen_at,
          l.region_code,
          l.country,
          l.region,
          l.city,
          l.latitude,
          l.longitude
       FROM service s
       INNER JOIN location l ON l.id_location = s.location_id_location
       ORDER BY s.name`,
    );
    return result.rows;
  }
}

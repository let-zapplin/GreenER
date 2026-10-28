import pool from "../../db/connection.js";
import { LocalidadesRepository } from "../localidades/localidades.repository.js";

export interface ListedService {
  id_service: number;
  external_id: string;
  name: string;
  status: string;
  last_seen_at: Date | null;
  region_code: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ============================================================
// CLASSE: ServicosRepository
// Responsabilidade: Acesso ao banco de dados (SQL puro)
// ============================================================
export class ServicosRepository extends LocalidadesRepository{
  
  // ========================================================
  // SERVICE
  // ========================================================

  // Buscar service por ID externo
  async findByExternalId(externalId: string) {
    const result = await pool.query(`SELECT * FROM service WHERE id = $1`, [
      externalId,
    ]);
    return result.rows[0] ?? null;
  }

  // Criar novo service
  async createService(data: { id: string; name: string; locationId: number }) {
    const result = await pool.query(
      `INSERT INTO service
       (
         id,
         name,
         location_id_location,
         status,
         last_seen_at
       )
     VALUES ($1, $2, $3, 'active', NOW())
     RETURNING *`,
      [data.id, data.name, data.locationId],
    );

    return result.rows[0];
  }

  // Atualizar service existente
  async updateService(data: { id: string; name: string; locationId: number }) {
    const result = await pool.query(
      `UPDATE service
     SET
       name = $1,
       location_id_location = $2,
       status = 'active',
       last_seen_at = NOW()
     WHERE id = $3
     RETURNING *`,
      [data.name, data.locationId, data.id],
    );
    return result.rows[0];
  }

  async markRemovedExcept(activeExternalIds: string[]): Promise<number> {
    if (activeExternalIds.length === 0) {
      const result = await pool.query(
        `UPDATE service
       SET status = 'removed'
       WHERE status <> 'removed'`,
      );

      return result.rowCount ?? 0;
    }

    const result = await pool.query(
      `UPDATE service
     SET status = 'removed'
     WHERE
       id <> ALL($1::text[])
       AND status <> 'removed'`,
      [activeExternalIds],
    );

    return result.rowCount ?? 0;
  }

  // ========================================================
  // US03: Listar todos os serviços
  // ========================================================
  async listAll(): Promise<ListedService[]> {
    const result = await pool.query<ListedService & Record<string, unknown>>(
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

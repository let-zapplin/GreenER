import pool from "../../db/connection.js";

// ============================================================
// CLASSE: ServicosRepository
// Responsabilidade: Acesso ao banco de dados (SQL puro)
// ============================================================
export class ServicosRepository {
  // ========================================================
  // LOCATION
  // ========================================================

  // Buscar location por region_code + city
  async findLocationByRegionAndCity(regionCode: string, city: string) {
    const result = await pool.query(
      `SELECT * FROM location 
             WHERE region_code = $1 AND city = $2`,
      [regionCode, city],
    );
    return result.rows[0] ?? null;
  }

  // Criar nova location
  async createLocation(location: {
    region_code: string;
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  }) {
    const result = await pool.query(
      `INSERT INTO location 
             (region_code, country, region, city, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
      [
        location.region_code,
        location.country,
        location.region,
        location.city,
        location.latitude,
        location.longitude,
      ],
    );
    return result.rows[0];
  }

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
             (id, name, location_id_location)
             VALUES ($1, $2, $3)
             RETURNING *`,
      [data.id, data.name, data.locationId],
    );
    return result.rows[0];
  }

  // Atualizar service existente
  async updateService(data: { id: string; name: string; locationId: number }) {
    await pool.query(
      `UPDATE service 
             SET name = $1, location_id_location = $2
             WHERE id = $3`,
      [data.name, data.locationId, data.id],
    );
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
          l.region_code,
          l.country,
          l.region,
          l.city,
          l.latitude,
          l.longitude
       FROM service s
       INNER JOIN location l ON l.id_location = s.location_id_location
       ORDER BY s.name`
    );
    return result.rows;
  }
}
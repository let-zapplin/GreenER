import pool from "../../db/connection.js";

// ============================================================
// CLASSE: IntensidadesRepository
// Responsabilidade: Acesso ao banco de dados (SQL puro)
// ============================================================
export class LocalidadesRepository {
  // ========================================================
  // LOCATION
  // ========================================================

  // Buscar location por region_code
  async findLocationByRegion(regionCode: string) {
    const result = await pool.query(
      `SELECT * FROM location 
             WHERE region_code = $1`,
      [regionCode],
    );
    return result.rows[0] ?? null;
  }

  // Criar nova location
  async createLocation(location: {
    regionCode: string;
    country: string;
    region: string;
    city: string | null;
    latitude: number;
    longitude: number;
  }) {
    const result = await pool.query(
      `INSERT INTO location 
             (region_code, country, region, city, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
      [
        location.regionCode,
        location.country,
        location.region,
        location.city,
        location.latitude,
        location.longitude,
      ],
    );
    return result.rows[0];
  }

  // Atualizar location existente
  async updateLocation(data: { 
    city: string | null, 
    latitude: number, 
    longitude: number, 
    regionCode: string }
  ) {
    const result = await pool.query(
      `UPDATE location
     SET
       city = $1
       latitude = $2
       longitude = $3
     WHERE region_code = $4
     RETURNING *`,
      [data.city, data.latitude, data.longitude, data.regionCode],
    );
    return result.rows[0]
  }

}
import pool from "../../db/connection.js";

export interface DashboardServiceAvailability {
  activeServiceCount: number;
  unavailableServiceCount: number;
}

interface DashboardServiceAvailabilityRow {
  active_service_count: number;
  unavailable_service_count: number;
}

export class DashboardRepository {
  async countServicesByAvailability(): Promise<DashboardServiceAvailability> {
    const result = await pool.query<DashboardServiceAvailabilityRow>(
      `SELECT
         COUNT(*) FILTER (
           WHERE latest_collection.status IS NULL
              OR latest_collection.status IN ('success', 'no_metrics')
         )::integer AS active_service_count,
         COUNT(*) FILTER (
           WHERE latest_collection.status IN ('unavailable', 'error')
         )::integer AS unavailable_service_count
       FROM service s
       LEFT JOIN LATERAL (
         SELECT c.status
         FROM collection c
         WHERE c.service_id_service = s.id_service
         ORDER BY c.attempted_at DESC, c.id_collection DESC
         LIMIT 1
       ) latest_collection ON TRUE
       WHERE s.status = 'active'`,
    );

    return {
      activeServiceCount: result.rows[0].active_service_count,
      unavailableServiceCount: result.rows[0].unavailable_service_count,
    };
  }
}

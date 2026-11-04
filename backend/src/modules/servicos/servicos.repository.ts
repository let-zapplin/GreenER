import pool from "../../db/connection.js";
import { LocalidadesRepository } from "../localidades/localidades.repository.js";

export type CollectionStatus =
  | "success"
  | "no_metrics"
  | "unavailable"
  | "error";

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
  last_collection_status: CollectionStatus | null;
  last_collection_at: Date | null;
}

/** Acesso ao banco para o catálogo de serviços (SQL puro). */
export class ServicosRepository extends LocalidadesRepository{

  /** Busca pelo `id` da API externa, que é a chave usada na sincronização. */
  async findByExternalId(externalId: string) {
    const result = await pool.query(`SELECT * FROM service WHERE id = $1`, [
      externalId,
    ]);
    return result.rows[0] ?? null;
  }

  /** Cria o serviço já como `active` e registra `last_seen_at`. */
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

  /**
   * Atualiza o serviço e o reativa: um serviço que voltou ao catálogo
   * deixa de ser `removed`.
   */
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

  /**
   * Marca como `removed` tudo que está ativo e não veio no catálogo atual.
   *
   * A exclusão é lógica porque as coletas referenciam `service`; apagar a
   * linha perderia o histórico. O caso de lista vazia é tratado à parte
   * porque `id <> ALL('{}')` não seleciona nenhuma linha.
   */
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

  /**
   * Lista os serviços com localização e a última coleta.
   *
   * A subconsulta LATERAL traz apenas a coleta mais recente de cada serviço;
   * um JOIN comum multiplicaria as linhas do serviço por todo o histórico.
   */
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
          l.longitude,
          c.status AS last_collection_status,
          c.attempted_at AS last_collection_at
       FROM service s
       INNER JOIN location l ON l.id_location = s.location_id_location
       LEFT JOIN LATERAL (
         SELECT status, attempted_at
         FROM collection
         WHERE service_id_service = s.id_service
         ORDER BY attempted_at DESC, id_collection DESC
         LIMIT 1
       ) c ON TRUE
       ORDER BY s.name`,
    );
    return result.rows;
  }
}

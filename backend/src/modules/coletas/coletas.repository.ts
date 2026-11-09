import pool from "../../db/connection.js";
import type { FetchMetricResult } from "../../integrations/metrics-api.js";

export class ColetasRepository {
  /**
   * Persiste uma tentativa de coleta.
   *
   * A linha em `collection` é gravada para todo estado — inclusive `no_metrics`
   * e `unavailable` — porque o histórico precisa registrar a tentativa mesmo
   * sem métricas. Já `metrics` só recebe dados em `success`, pois é lá que
   * ficam as amostras brutas.
   *
   * Tentativa e métricas ficam na mesma transação: se a segunda inserção
   * falhar, o `ROLLBACK` evita uma coleta `success` sem dados associados.
   */
  async saveCollection(
    serviceId: number,
    result: FetchMetricResult,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      let httpStatus: number | null = null;
      let failureReason: string | null = null;

      // `no_metrics` guarda o 404 do agregador, mas não é falha e por isso
      // não recebe motivo; só `error` e `unavailable` preenchem a justificativa.
      if (result.status === "no_metrics") httpStatus = result.http_status;
      if (result.status === "error" || result.status === "unavailable") {
        httpStatus = result.http_status || null;
        failureReason = result.failure_reason;
      }

      // A tentativa é registrada para todos os estados, com ou sem métricas.
      const collectionResult = await client.query(
        `INSERT INTO collection (service_id_service, status, failure_reason, http_status)
         VALUES ($1, $2, $3, $4)
         RETURNING id_collection`,
        [serviceId, result.status, failureReason, httpStatus],
      );

      const collectionId = collectionResult.rows[0].id_collection;

      // Dados brutos só existem quando a API respondeu com métricas válidas.
      if (result.status === "success") {
        await client.query(
          `INSERT INTO metrics 
           (collection_id_collection, cpu_percent, memory_gb, disk_gb, network_gb, collection_interval_seconds, recorded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            collectionId,
            result.data.cpu_percent,
            result.data.memory_gb,
            result.data.disk_gb,
            result.data.network_gb,
            result.data.collection_interval_seconds,
            result.data.recorded_at || new Date(),
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      console.error("❌ Erro ao salvar coleta no banco:", error);
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("❌ Erro ao desfazer a transação da coleta:", rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }
  /**
   * Histórico completo do serviço, mais recente primeiro.
   *
   * O LEFT JOIN é necessário porque tentativas `no_metrics`, `unavailable` e
   * `error` não têm linha em `metrics`; um INNER JOIN esconderia justamente
   * os casos de falha.
   */
  async findHistoryByService(serviceId: number) {
  const result = await pool.query(
    `SELECT
       c.id_collection,
       c.service_id_service AS service_id,
       c.status,
       c.failure_reason,
       c.http_status,
       c.attempted_at,
       m.recorded_at,
       m.cpu_percent,
       m.memory_gb,
       m.disk_gb,
       m.network_gb,
       m.collection_interval_seconds
     FROM collection AS c
     LEFT JOIN metrics AS m
       ON m.collection_id_collection = c.id_collection
     WHERE c.service_id_service = $1
     ORDER BY c.attempted_at DESC, c.id_collection DESC`,
    [serviceId],
  );

  return result.rows;
}
}

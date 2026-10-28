import pool from "../../db/connection.js";
import type { FetchMetricResult } from "../../integrations/metrics-api.js";

export class ColetasRepository {
  async saveCollection(
    serviceId: number,
    result: FetchMetricResult,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN"); // Inicia a transação

      let httpStatus: number | null = null;
      let failureReason: string | null = null;

      if (result.status === "no_metrics") httpStatus = result.http_status;
      if (result.status === "error" || result.status === "unavailable") {
        httpStatus = result.http_status || null;
        failureReason = result.failure_reason;
      }

      // 1. Insere a TENTATIVA na tabela collection
      const collectionResult = await client.query(
        `INSERT INTO collection (service_id_service, status, failure_reason, http_status)
         VALUES ($1, $2, $3, $4)
         RETURNING id_collection`,
        [serviceId, result.status, failureReason, httpStatus],
      );

      const collectionId = collectionResult.rows[0].id_collection;

      // 2. Se deu certo, insere os DADOS BRUTOS na tabela metrics
      if (result.status === "success") {
        await client.query(
          `INSERT INTO metrics 
           (collection_id_collection, cpu_percent, memory_gb, disk_gb, network_gb, recorded_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            collectionId,
            result.data.cpu_percent,
            result.data.memory_gb,
            result.data.disk_gb,
            result.data.network_gb,
            result.data.recorded_at || new Date(),
          ],
        );
      }

      await client.query("COMMIT"); // Confirma tudo no banco
    } catch (error) {
      console.error("❌ Erro ao salvar coleta no banco:", error);
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("❌ Erro ao desfazer a transação da coleta:", rollbackError);
      }
      throw error;
    } finally {
      client.release(); // Devolve a conexão
    }
  }
  //consulta o histórico de coletas 
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
       m.network_gb
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

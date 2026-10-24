import pool from "../../db/connection.js";
import type { FetchMetricResult } from "../../integrations/metrics-api.js";

export class MetricaRepository {
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
      if (result.status === "error") {
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
      await client.query("ROLLBACK"); // Desfaz se der erro
      console.error("❌ Erro ao salvar coleta no banco:", error);
      throw error; // Joga pro middleware global se for erro de banco
    } finally {
      client.release(); // Devolve a conexão
    }
  }
}

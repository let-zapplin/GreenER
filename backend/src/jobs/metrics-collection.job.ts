import { env } from "../config/env.js";
import { ColetasService } from "../modules/coletas/coletas.service.js";

const coletasService = new ColetasService();

export async function startMetricsCollection(): Promise<void> {
  async function collectMetrics(): Promise<void> {
    try {
      console.log("🔄 Iniciando coleta periódica de métricas...");

      const summary = await coletasService.collectAllMetrics();

      if (!summary.skipped) {
        console.log(
          `✅ Coleta periódica concluída: ${summary.successCount} sucessos, ` +
            `${summary.noMetricsCount} sem métricas, ` +
            `${summary.unavailableCount} indisponíveis, ${summary.errorCount} falhas`,
        );
      }
    } catch (error) {
      console.error("❌ Falha na coleta periódica de métricas:", error);
    } finally {
      // Reagenda apenas após o término do ciclo, evitando sobreposição.
      setTimeout(collectMetrics, env.metricsCollectionIntervalMs);
    }
  }

  await collectMetrics();
}

import { env } from "../config/env.js";
import { MetricaService } from "../modules/coletas/coletas.service.js";

const metricaService = new MetricaService();

export async function startMetricsCollection(): Promise<void> {
  async function collectMetrics(): Promise<void> {
    try {
      console.log("🔄 Iniciando coleta periódica de métricas...");

      const summary = await metricaService.collectAllMetrics();

      if (!summary.skipped) {
        console.log(
          `✅ Coleta periódica concluída: ${summary.success} sucessos, ` +
            `${summary.noMetrics} sem métricas, ${summary.errors} falhas`,
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

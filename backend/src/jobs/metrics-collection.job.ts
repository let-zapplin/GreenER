import { env } from "../config/env.js";
import { ColetasService } from "../modules/coletas/coletas.service.js";

const coletasService = new ColetasService();

export async function startMetricsCollection(): Promise<void> {
  let cycle = 0;

  console.log(
    `🕒 Coleta automática ativa: intervalo de ${env.metricsCollectionIntervalMs} ms`,
  );

  async function collectMetrics(): Promise<void> {
    cycle++;

    try {
      console.log(`🔄 Iniciando coleta automática #${cycle}...`);

      const summary = await coletasService.collectAllMetrics();

      if (summary.skipped) {
        console.warn(
          `⚠️ Coleta #${cycle} ignorada: ciclo anterior ainda em execução.`,
        );
      } else {
        console.log(
          `✅ Coleta #${cycle} concluída: ${summary.successCount} sucessos, ` +
            `${summary.noMetricsCount} sem métricas, ` +
            `${summary.unavailableCount} indisponíveis, ${summary.errorCount} falhas`,
        );
      }
    } catch (error) {
      console.error(`❌ Falha na coleta automática #${cycle}:`, error);
    } finally {
      // Reagenda apenas após o término do ciclo, evitando sobreposição.
      setTimeout(collectMetrics, env.metricsCollectionIntervalMs);
    }
  }

  await collectMetrics();
}

import { env } from "../config/env.js";
import { ServicosService } from "../modules/servicos/servicos.service.js";

const servicosService = new ServicosService();

/**
 * Inicia o ciclo de descoberta automática.
 *
 * Executa uma vez na chamada e reagenda após cada término. Falha em um ciclo
 * vira log de erro e não encerra o backend.
 */
export async function startServiceSync(): Promise<void> {
  let cycle = 0;

  console.log(
    `🕒 Descoberta automática ativa: intervalo de ${env.serviceSyncIntervalMs} ms`,
  );

  async function syncServices(): Promise<void> {
    cycle++;

    try {
      console.log(`🔄 Iniciando descoberta automática #${cycle}...`);

      const result = await servicosService.saveServices();

      console.log(
        `✅ Descoberta #${cycle} concluída: ${result.created} criados, ` +
          `${result.updated} atualizados, ${result.removed} removidos`,
      );
    } catch (error) {
      console.error(`❌ Falha na descoberta automática #${cycle}:`, error);
    } finally {
      // Reagenda apenas após o término do ciclo, evitando sobreposição.
      setTimeout(syncServices, env.serviceSyncIntervalMs);
    }
  }

  await syncServices();
}

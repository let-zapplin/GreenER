import { env } from "../config/env.js";
import { IntensidadesService } from "../modules/intensidades/intensidades.service.js";

const intensidadesService = new IntensidadesService();

export async function startCarbonIntensitySync(): Promise<void> {
  let cycle = 0;

  console.log(
    `🕒 Sincronização automática de intensidades ativa: intervalo de ${env.carbonIntensitySyncIntervalMs} ms`,
  );

  async function syncCarbonIntensities(): Promise<void> {
    cycle++;

    try {
      console.log(`🔄 Iniciando sincronização de intensidades #${cycle}...`);

      const result = await intensidadesService.saveIntensity();

      console.log(
        `✅ Sincronização de intensidades #${cycle} concluída: ${result.inserted} snapshots inseridos`,
      );
    } catch (error) {
      console.error(
        `❌ Falha na sincronização automática de intensidades #${cycle}:`,
        error,
      );
    } finally {
      setTimeout(syncCarbonIntensities, env.carbonIntensitySyncIntervalMs);
    }
  }

  await syncCarbonIntensities();
}

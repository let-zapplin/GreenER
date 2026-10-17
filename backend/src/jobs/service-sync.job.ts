import { env } from "../config/env.js";
import { ServicosService } from "../modules/servicos/servicos.service.js";

const servicosService = new ServicosService();

export async function startServiceSync(): Promise<void> {
  async function syncServices(): Promise<void> {
    try {
      console.log("🔄 Iniciando sincronização automática de serviços...");

      const result = await servicosService.saveServices();

      console.log(
        `✅ Sincronização concluída: ${result.created} criados e ${result.updated} atualizados`,
      );
    } catch (error) {
      console.error("❌ Falha na sincronização automática de serviços:", error);
    } finally {
      setTimeout(syncServices, env.collectionIntervalMs);
    }
  }

  await syncServices();
}

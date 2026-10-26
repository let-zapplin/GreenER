import { fetchServiceMetrics } from "../../integrations/metrics-api.js";
import { ServicosService } from "../servicos/servicos.service.js";
import { MetricaRepository } from "./coletas.repository.js";

export class MetricaService {
  private servicosService = new ServicosService();
  private repository = new MetricaRepository();

  async collectAllMetrics(): Promise<void> {
    console.log("📊 Iniciando coleta de métricas em lote...");
    
    // Pega a lista de serviços do banco (US03)
    const servicos = await this.servicosService.listAll();
    
    let successCount = 0;
    let noMetricsCount = 0;
    let errorCount = 0;

    // O loop garante que a falha de um NÃO interrompe os outros (Critério de Aceite)
    for (const servico of servicos) {
      
      // Busca a métrica (a função trata timeout e falhas de rede internamente)
      const result = await fetchServiceMetrics(servico.external_id);

      // Salva no banco independente do resultado (sucesso, sem métricas ou erro)
      await this.repository.saveCollection(servico.id_service, result);

      if (result.status === 'success') {
        successCount++;
        console.log(`✅ Métricas salvas: ${servico.name}`);
      } else if (result.status === 'no_metrics') {
        noMetricsCount++;
        console.log(`⚠️ Sem métricas: ${servico.name}`);
      } else {
        errorCount++;
        console.log(`❌ Falha na coleta: ${servico.name} (${result.failure_reason})`);
      }
    }

    console.log(`🏁 Coleta finalizada: ${successCount} sucessos, ${noMetricsCount} sem métricas, ${errorCount} falhas.`);
  }
}
import { fetchServiceMetrics } from "../../integrations/metrics-api.js";
import { ServicosService } from "../servicos/servicos.service.js";
import { MetricaRepository } from "./coletas.repository.js";

export interface CollectionSummary {
  skipped: boolean;
  services: number;
  success: number;
  noMetrics: number;
  errors: number;
}

// Compartilhado entre instâncias para que o job periódico e a rota manual
// não consultem a API externa em paralelo.
let collectionInProgress = false;

export class MetricaService {
  private servicosService = new ServicosService();
  private repository = new MetricaRepository();

  async collectAllMetrics(): Promise<CollectionSummary> {
    if (collectionInProgress) {
      console.warn("⚠️ Coleta anterior ainda em execução; ciclo ignorado.");
      return { skipped: true, services: 0, success: 0, noMetrics: 0, errors: 0 };
    }

    collectionInProgress = true;

    try {
      console.log("📊 Iniciando coleta de métricas em lote...");

      const servicos = await this.servicosService.listAll();

      const summary: CollectionSummary = {
        skipped: false,
        services: servicos.length,
        success: 0,
        noMetrics: 0,
        errors: 0,
      };

      for (const servico of servicos) {
        try {
          const result = await fetchServiceMetrics(servico.external_id);

          // Cada execução cria uma nova coleta (+ métricas quando há dados),
          // preservando as amostras anteriores.
          await this.repository.saveCollection(servico.id_service, result);

          if (result.status === "success") {
            summary.success++;
            console.log(`✅ Métricas salvas: ${servico.name}`);
          } else if (result.status === "no_metrics") {
            summary.noMetrics++;
            console.log(`⚠️ Sem métricas: ${servico.name}`);
          } else {
            summary.errors++;
            console.log(
              `❌ Falha na coleta: ${servico.name} (${result.failure_reason})`,
            );
          }
        } catch (error) {
          // Falha de um serviço não pode interromper a coleta dos demais.
          summary.errors++;
          console.error(
            `❌ Erro ao processar a coleta de ${servico.name}:`,
            error,
          );
        }
      }

      console.log(
        `🏁 Coleta finalizada: ${summary.success} sucessos, ${summary.noMetrics} sem métricas, ${summary.errors} falhas.`,
      );

      return summary;
    } finally {
      collectionInProgress = false;
    }
  }
}

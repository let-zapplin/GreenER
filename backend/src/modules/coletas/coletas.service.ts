import {
  fetchServiceMetrics,
  type FetchMetricResult,
} from "../../integrations/metrics-api.js";
import { ServicosService } from "../servicos/servicos.service.js";
import type { ListedService } from "../servicos/servicos.repository.js";
import { ColetasRepository } from "./coletas.repository.js";

interface CollectionFailure {
  service: string;
  reason: string;
}

export interface CollectionSummary {
  totalServices: number;
  successCount: number;
  noMetricsCount: number;
  errorCount: number;
  failures: CollectionFailure[];
}

export class ColetasService {
  constructor(
    private readonly servicosService: Pick<ServicosService, "listAll"> =
      new ServicosService(),
    private readonly repository: Pick<ColetasRepository, "saveCollection"> =
      new ColetasRepository(),
    private readonly fetchMetrics: typeof fetchServiceMetrics =
      fetchServiceMetrics,
  ) {}

  async collectAllMetrics(): Promise<CollectionSummary> {
    console.log("📊 Iniciando coleta de métricas em lote...");

    const services: ListedService[] = await this.servicosService.listAll();
    const availableServices = services.filter(
      (service) => service.status === "active",
    );
    const summary: CollectionSummary = {
      totalServices: availableServices.length,
      successCount: 0,
      noMetricsCount: 0,
      errorCount: 0,
      failures: [],
    };

    for (const service of availableServices) {
      let result: FetchMetricResult;

      try {
        result = await this.fetchMetrics(service.external_id);
      } catch (error: unknown) {
        console.error(
          `❌ Erro inesperado ao consultar métricas de ${service.name}:`,
          error,
        );
        result = {
          status: "error",
          failure_reason: "Ocorreu um erro inesperado ao consultar as métricas.",
        };
      }

      try {
        await this.repository.saveCollection(service.id_service, result);
      } catch (error: unknown) {
        summary.errorCount++;
        summary.failures.push({
          service: service.name,
          reason: "Não foi possível salvar o resultado da coleta no banco.",
        });
        console.error(
          `❌ Erro ao salvar a coleta de ${service.name}; os próximos serviços serão processados:`,
          error,
        );
        continue;
      }

      if (result.status === "success") {
        summary.successCount++;
        console.log(`✅ Métricas salvas: ${service.name}`);
      } else if (result.status === "no_metrics") {
        summary.noMetricsCount++;
        console.log(`⚠️ Sem métricas: ${service.name}`);
      } else {
        summary.errorCount++;
        summary.failures.push({
          service: service.name,
          reason: result.failure_reason,
        });
        console.error(
          `❌ Falha na coleta: ${service.name} (${result.failure_reason})`,
        );
      }
    }

    console.log(
      `🏁 Coleta finalizada: ${summary.successCount} sucessos, ${summary.noMetricsCount} sem métricas, ${summary.errorCount} falhas.`,
    );
    return summary;
  }
}
import {
  fetchServiceMetrics,
  type FetchMetricResult,
} from "../../integrations/metrics-api.js";
import { ServicosService } from "../servicos/servicos.service.js";
import type { ListedService } from "../servicos/servicos.repository.js";
import { ColetasRepository } from "./coletas.repository.js";
import { AppError } from "../../shared/errors/AppError.js";

interface CollectionFailure {
  service: string;
  reason: string;
}

/**
 * Resultado de um ciclo de coleta.
 *
 * Contadores por estado:
 * - `success`: métricas recebidas e persistidas;
 * - `no_metrics`: serviço ativo que não exporta métricas (não é falha);
 * - `unavailable`: API ou exportador indisponível (o serviço segue no catálogo);
 * - `error`: resposta inválida ou falha ao persistir a coleta.
 *
 * `skipped` indica que o ciclo foi ignorado porque o anterior ainda rodava.
 */
export interface CollectionSummary {
  skipped: boolean;
  totalServices: number;
  successCount: number;
  noMetricsCount: number;
  unavailableCount: number;
  errorCount: number;
  failures: CollectionFailure[];
}

// Compartilhado entre instâncias para que o job periódico e a rota manual
// não consultem a API externa em paralelo.
let collectionInProgress = false;

export class ColetasService {
  constructor(
    private readonly servicosService: Pick<
      ServicosService,
      "listAll"
    > = new ServicosService(),
    private readonly repository: Pick<
      ColetasRepository,
      "saveCollection" | "findHistoryByService"
    > = new ColetasRepository(),
    private readonly fetchMetrics: typeof fetchServiceMetrics = fetchServiceMetrics,
  ) {}

  /**
   * Coleta as métricas de todos os serviços ativos, um por vez.
   *
   * A guarda `collectionInProgress` é compartilhada entre o job periódico e a
   * rota manual; quando um ciclo já está em andamento, o novo retorna
   * `skipped: true` em vez de consultar a API externa em paralelo.
   */
  async collectAllMetrics(): Promise<CollectionSummary> {
    if (collectionInProgress) {
      console.warn("⚠️ Coleta anterior ainda em execução; ciclo ignorado.");
      return {
        skipped: true,
        totalServices: 0,
        successCount: 0,
        noMetricsCount: 0,
        unavailableCount: 0,
        errorCount: 0,
        failures: [],
      };
    }

    collectionInProgress = true;

    try {
      console.log("📊 Iniciando coleta de métricas em lote...");

      const services: ListedService[] = await this.servicosService.listAll();
      // Serviços `removed` continuam no banco apenas para histórico;
      // consultar a API deles geraria coletas de serviços que saíram do catálogo.
      const availableServices = services.filter(
        (service) => service.status === "active",
      );
      const summary: CollectionSummary = {
        skipped: false,
        totalServices: availableServices.length,
        successCount: 0,
        noMetricsCount: 0,
        unavailableCount: 0,
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
            failure_reason:
              "Ocorreu um erro inesperado ao consultar as métricas.",
          };
        }

        // A persistência é isolada por serviço: falha aqui vira `errorCount`
        // e o loop segue com os demais, em vez de abortar o ciclo inteiro.
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
        } else if (result.status === "unavailable") {
          summary.unavailableCount++;
          summary.failures.push({
            service: service.name,
            reason: result.failure_reason,
          });
          console.error(
            `📡 Serviço indisponível: ${service.name} (${result.failure_reason})`,
          );
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
        `🏁 Coleta finalizada: ${summary.successCount} sucessos, ` +
          `${summary.noMetricsCount} sem métricas, ` +
          `${summary.unavailableCount} indisponíveis, ${summary.errorCount} falhas.`,
      );
      return summary;
    } finally {
      collectionInProgress = false;
    }
  }

  /**
   * Histórico de tentativas de coleta de um serviço, da mais recente para a
   * mais antiga.
   *
   * O ID chega como string da rota e é validado antes da consulta: o valor
   * precisa caber em `INT4`, que é o tipo de `service_id_service`.
   */
  async getHistoryByService(serviceId: string) {
    if (!/^[1-9]\d*$/.test(serviceId)) {
      throw new AppError(
        "O ID do serviço deve ser um inteiro positivo",
        400,
        "INVALID_SERVICE_ID",
      );
    }

    const id = Number(serviceId);

    // Limite do INT4 usado em service_id_service: acima disso a consulta
    // falharia no driver em vez de responder 400.
    if (!Number.isSafeInteger(id) || id > 2147483647) {
      throw new AppError(
        "ID do serviço fora do intervalo permitido",
        400,
        "INVALID_SERVICE_ID",
      );
    }

    return this.repository.findHistoryByService(id);
  }
}

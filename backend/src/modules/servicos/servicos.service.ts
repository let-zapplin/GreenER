import { env } from "../../config/env.js";
import { ExternalApiError } from "../../shared/errors/AppError.js";
import {
  ServicosRepository,
  type ListedService,
} from "./servicos.repository.js";

/** Localização retornada por `GET /services`. */
export interface Location {
  region_code: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number;
  longitude: number;
}

/** Serviço como retornado por `GET /services`. */
export interface ExternalService {
  id: string;
  name: string;
  location: Location;
  metrics_path: string;
}

/**
 * Regras de negócio do catálogo de serviços: descoberta na API externa,
 * sincronização com o banco e listagem do que está persistido.
 */
export class ServicosService {
  private readonly repository: ServicosRepository;

  constructor() {
    this.repository = new ServicosRepository();
  }

  /**
   * Consulta `GET /services` e devolve o catálogo bruto da API externa.
   *
   * O AbortController existe porque a API não tem contrato de tempo de
   * resposta: ao estourar `EXTERNAL_API_TIMEOUT_MS` a requisição é cancelada.
   * Qualquer falha vira `ExternalApiError`, tratada pelo errorMiddleware.
   */
  async discoverServices(): Promise<ExternalService[]> {
    console.log("🔍 Descobrindo serviços...");

    const url = `${env.metricsApiUrl}/services`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      env.externalApiTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const services: ExternalService[] = await response.json();

      console.log(`✅ ${services.length} serviços encontrados`);

      services.forEach((svc) => {
        console.log(`  - ${svc.name} (${svc.location.region_code})`);
      });

      return services;
    } catch (error: unknown) {
      console.error("❌ Erro na API Metrics:", error);
      throw new ExternalApiError("Falha ao consultar a API de métricas");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sincroniza o catálogo local com o catálogo atual da API externa.
   *
   * `created` e `updated` contam serviços presentes em `/services`;
   * `removed` conta os que estavam ativos e desapareceram do catálogo.
   * Eles são marcados como `removed` em vez de excluídos para preservar o
   * histórico de coletas que referencia `service`.
   *
   * A localização é resolvida antes do serviço porque `service` depende de
   * `location_id_location`.
   */
  async saveServices(): Promise<{
    created: number;
    updated: number;
    removed: number;
  }> {
    console.log("💾 Salvando serviços no banco...");

    const services = await this.discoverServices();
    const activeExternalIds = services.map((service) => service.id);

    let created = 0;
    let updated = 0;

    for (const svc of services) {
      let location = await this.repository.findLocationByRegion(
        svc.location.region_code
      );

      if (!location) {
        location = await this.repository.createLocation({
          regionCode: svc.location.region_code,
          country: svc.location.country,
          region: svc.location.region,
          city: svc.location.city,
          latitude: svc.location.latitude,
          longitude: svc.location.longitude,
        });

        const nomeCidade = svc.location.city ?? "cidade não informada";
        console.log(
          `  📍 Location criada para a região: ${svc.location.region_code} (${nomeCidade})`,
        );
      }

      const existing = await this.repository.findByExternalId(svc.id);

      if (existing) {
        await this.repository.updateService({
          id: svc.id,
          name: svc.name,
          locationId: location.id_location,
        });
        updated++;
      } else {
        await this.repository.createService({
          id: svc.id,
          name: svc.name,
          locationId: location.id_location,
        });
        created++;
      }
    }

    // Feito depois do upsert para que o catálogo atual já esteja persistido.
    const removed =
      await this.repository.markRemovedExcept(activeExternalIds);
    console.log(
      `✅ ${created} criados, ${updated} atualizados, ${removed} removidos`,
    );

    return { created, updated, removed };
  }

  /** Lista o catálogo persistido com localização e última coleta de cada serviço. */
  async listAll(): Promise<ListedService[]> {
    console.log("📋 Listando serviços do banco...");

    const services = await this.repository.listAll();

    console.log(`✅ ${services.length} serviços listados`);

    return services;
  }
}

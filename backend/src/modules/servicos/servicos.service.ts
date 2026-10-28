import { env } from "../../config/env.js";
import { ExternalApiError } from "../../shared/errors/AppError.js";
import {
  ServicosRepository,
  type ListedService,
} from "./servicos.repository.js";

// ============================================================
// TIPO: Location
// Localização do serviço (retornada pela API)
// ============================================================
export interface Location {
  region_code: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number;
  longitude: number;
}

// ============================================================
// TIPO: ExternalService
// Representa o que a API externa retorna
// ============================================================
export interface ExternalService {
  id: string;
  name: string;
  location: Location;
  metrics_path: string;
}

// ============================================================
// CLASSE: ServicosService
// Responsabilidade: Regras de negócio do módulo de serviços
// ============================================================
export class ServicosService {
  private readonly repository: ServicosRepository;

  constructor() {
    this.repository = new ServicosRepository();
  }

  // ========================================================
  // US01: Consultar /services e interpretar o retorno
  // ========================================================
  async discoverServices(): Promise<ExternalService[]> {
    console.log("🔍 Descobrindo serviços...");

    const url = `${env.metricsApiUrl}/services`;

    // AbortController: cancela se passar do timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      env.externalApiTimeoutMs,
    );

    try {
      // --------------------------------------------------
      // PASSO 1: CONSULTAR /services
      // --------------------------------------------------
      const response = await fetch(url, {
        signal: controller.signal,
      });

      // Verifica se a resposta foi OK (200-299)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // --------------------------------------------------
      // PASSO 2: INTERPRETAR O JSON
      // --------------------------------------------------
      const services: ExternalService[] = await response.json();

      // --------------------------------------------------
      // PASSO 3: IDENTIFICAR OS SERVIÇOS
      // --------------------------------------------------
      console.log(`✅ ${services.length} serviços encontrados`);

      services.forEach((svc) => {
        console.log(`  - ${svc.name} (${svc.location.region_code})`);
      });

      return services;
    } catch (error: unknown) {
      // --------------------------------------------------
      // TRATAMENTO DE ERRO
      // Lança ExternalApiError → middleware trata
      // --------------------------------------------------
      console.error("❌ Erro na API Metrics:", error);
      throw new ExternalApiError("Falha ao consultar a API de métricas");
    } finally {
      // Limpa o timeout (evita memory leak)
      clearTimeout(timeoutId);
    }
  }

  // ========================================================
  // US02: Salvar serviços no banco (evitar duplicação)
  // ========================================================
  async saveServices(): Promise<{
    created: number;
    updated: number;
    removed: number;
  }> {
    console.log("💾 Salvando serviços no banco...");

    // 1. Descobrir serviços (US01)
    const services = await this.discoverServices();
    const activeExternalIds = services.map((service) => service.id);

    let created = 0;
    let updated = 0;

    // 2. Para cada serviço
    for (const svc of services) {
      // --------------------------------------------------
      // PASSO 1: Verificar/criar location
      // --------------------------------------------------
      let location = await this.repository.findLocationByRegion(
        svc.location.region_code
      );

      // 2. Se não existe, cria
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

      // --------------------------------------------------
      // PASSO 2: Verificar/criar service
      // --------------------------------------------------
      const existing = await this.repository.findByExternalId(svc.id);

      if (existing) {
        // Já existe → Atualizar
        await this.repository.updateService({
          id: svc.id,
          name: svc.name,
          locationId: location.id_location,
        });
        updated++;
      } else {
        // Não existe → Criar
        await this.repository.createService({
          id: svc.id,
          name: svc.name,
          locationId: location.id_location,
        });
        created++;
      }
    }

    const removed =
      await this.repository.markRemovedExcept(activeExternalIds);
    console.log(
      `✅ ${created} criados, ${updated} atualizados, ${removed} removidos`,
    );

    return { created, updated, removed };
  }
  // ========================================================
  // US03: Listar todos os serviços armazenados no banco
  // ========================================================
  async listAll(): Promise<ListedService[]> {
    console.log("📋 Listando serviços do banco...");

    const services = await this.repository.listAll();

    console.log(`✅ ${services.length} serviços listados`);

    return services;
  }
}

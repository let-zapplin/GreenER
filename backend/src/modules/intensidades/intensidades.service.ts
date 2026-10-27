import { env } from "../../config/env.js";
import { ExternalApiError } from "../../shared/errors/AppError.js";
import { IntensidadesRepository } from "./intensidades.repository.js";

// ============================================================
// TIPO: ExternalIntensity
// Representa o que a API externa retorna
// ============================================================
export interface ExternalIntensity {
  regionCode: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number;
  longitude: number;
  carbonIntensity: number,
  renewableShare: number
}

// ============================================================
// CLASSE: IntensidadesService
// Responsabilidade: Regras de negócio do módulo de intensidades de carbono
// ============================================================
export class IntensidadesService {
  private readonly repository: IntensidadesRepository;

  constructor() {
    this.repository = new IntensidadesRepository();
  }

  // ========================================================
  //  Consultar /regions e interpretar o retorno
  // ========================================================
  async discoverIntensities(): Promise<ExternalIntensity[]> {
    console.log("🔍 Descobrindo intensidades de carbono...");

    const url = `${env.carbonApiUrl}/regions`;

    // AbortController: cancela se passar do timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      env.externalApiTimeoutMs,
    );

    try {
      // --------------------------------------------------
      // PASSO 1: CONSULTAR /regions
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
      const intensidades: ExternalIntensity[] = await response.json();

      // --------------------------------------------------
      // PASSO 3: IDENTIFICAR OS INTENSIDADES
      // --------------------------------------------------
      console.log(`✅ ${intensidades.length} intensidades encontrados`);

      intensidades.forEach((its) => {
        console.log(`  - ${its.region} (${its.regionCode})`);
      });

      return intensidades;
    } catch (error) {
      // --------------------------------------------------
      // TRATAMENTO DE ERRO
      // Lança ExternalApiError → middleware trata
      // --------------------------------------------------
      console.error("❌ Erro na API Carbon:", error);
      throw new ExternalApiError("Falha ao consultar a API de intensidades de carbono");
    } finally {
      // Limpa o timeout (evita memory leak)
      clearTimeout(timeoutId);
    }
  }

  // ========================================================
  // Salvar intensidades no banco (evitar duplicação)
  // ========================================================
  async saveIntensity(): Promise<{
    created: number;
    updated: number;
  }> {
    console.log("💾 Salvando intensidades no banco...");

    // 1. Descobrir intensidades
    const intensities = await this.discoverIntensities();
    
    let created = 0;
    let updated = 0;

    // 2. Para cada serviço
    for (const its of intensities) {
      // --------------------------------------------------
      // PASSO 1: Verificar/criar location
      // --------------------------------------------------
      let location = await this.repository.findLocationByRegion(
        its.regionCode
      );

      if (!location) {
        // Se não existe, cria
        location = await this.repository.createLocation(its);
        console.log(`  📍 Location criada: ${its.region}`);
      }

      // --------------------------------------------------
      // PASSO 2: Verificar/criar intensity
      // --------------------------------------------------
      const existing = await this.repository.findByCode(its.regionCode);

      if (existing) {
        // Já existe → Atualizar
        // Elaborar
        // .
        // .
        // .
        // .
        // .
        // .
        // .
        // .
      } else {
        // Não existe → Criar
        await this.repository.createCarbonIntensity({
          idLocation: location.id_location,
          carbonIntensity: its.carbonIntensity,
          renewableShare: its.renewableShare,
        });
        created++;
      }
    }

    console.log(
      `✅ ${created} criados, ${updated} atualizados`,
    );

    return { created, updated };
  }
  // ========================================================
  // US03: Listar todas as intensidades armazenadas no banco
  // ========================================================
  async listAll() {
    console.log("📋 Listando intensidades do banco...");

    const intensities = await this.repository.listAllIntensities();

    console.log(`✅ ${intensities.length} serviços listados`);

    return intensities;
  }
}

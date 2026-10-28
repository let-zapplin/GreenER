import { env } from "../config/env.js";
import { ExternalApiError } from "../shared/errors/AppError.js";

export interface CarbonRegion {
	code: string;
	country: string;
	region: string;
	city?: string | null;
	latitude: number;
	longitude: number;
	carbon_intensity_gco2e_per_kwh: number;
	renewable_share_percent: number;
}

export interface CarbonRegionsResponse {
	regions: CarbonRegion[];
	total: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function isCarbonRegion(value: unknown): value is CarbonRegion {
	if (!isRecord(value)) return false;

	return (
		isNonEmptyString(value.code) &&
		isNonEmptyString(value.country) &&
		isNonEmptyString(value.region) &&
		(value.city === undefined || value.city === null || typeof value.city === "string") &&
		isFiniteNumber(value.latitude) &&
		value.latitude >= -90 &&
		value.latitude <= 90 &&
		isFiniteNumber(value.longitude) &&
		value.longitude >= -180 &&
		value.longitude <= 180 &&
		isFiniteNumber(value.carbon_intensity_gco2e_per_kwh) &&
		value.carbon_intensity_gco2e_per_kwh >= 0 &&
		isFiniteNumber(value.renewable_share_percent) &&
		value.renewable_share_percent >= 0 &&
		value.renewable_share_percent <= 100
	);
}

function parseCarbonRegions(value: unknown): CarbonRegionsResponse {
	if (!isRecord(value) || !Array.isArray(value.regions)) {
		throw new Error("Envelope de regiões inválido");
	}

	if (
		!Number.isInteger(value.total) ||
		(value.total as number) < 0 ||
		value.total !== value.regions.length ||
		!value.regions.every(isCarbonRegion)
	) {
		throw new Error("Catálogo de regiões inválido");
	}

	const regions = value.regions as CarbonRegion[];
	if (new Set(regions.map((region) => region.code)).size !== regions.length) {
		throw new Error("Catálogo contém códigos regionais duplicados");
	}

	return { regions, total: value.total as number };
}

export async function fetchCarbonRegions(): Promise<CarbonRegionsResponse> {
	const url = `${env.carbonApiUrl.replace(/\/+$/, "")}/regions`;
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		env.externalApiTimeoutMs,
	);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const payload: unknown = await response.json();
		return parseCarbonRegions(payload);
	} catch {
		throw new ExternalApiError(
			"Falha ao consultar ou validar o catálogo da API de intensidades de carbono",
		);
	} finally {
		clearTimeout(timeoutId);
	}
}

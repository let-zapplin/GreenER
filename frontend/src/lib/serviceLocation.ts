import type { ServiceLocation } from "../types/service";

type LocationParts = Pick<ServiceLocation, "city" | "region" | "country">;

type Coordinates = Pick<ServiceLocation, "latitude" | "longitude">;

// Cidade, região e país são combinados apenas quando existem, sem deixar
// separadores ou espaços vazios no texto.
export function formatServicePlace(location: LocationParts): string {
  const parts = [location.city, location.region, location.country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : "Localização não informada";
}

export function hasServiceCoordinates(location: Coordinates): boolean {
  return location.latitude !== null && location.longitude !== null;
}

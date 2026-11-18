import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatServicePlace,
  hasServiceCoordinates,
} from "../src/lib/serviceLocation.ts";
import type { ServiceLocation } from "../src/types/service.ts";

function location(
  overrides: Partial<ServiceLocation>,
): ServiceLocation {
  return {
    region_code: "br-sudeste",
    country: "Brazil",
    region: "Sudeste",
    city: "Sao Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
    ...overrides,
  };
}

test("combina cidade, região e país quando disponíveis", () => {
  assert.equal(
    formatServicePlace(location({})),
    "Sao Paulo · Sudeste · Brazil",
  );
});

test("omite a cidade quando ela não está cadastrada", () => {
  assert.equal(
    formatServicePlace(location({ city: null })),
    "Sudeste · Brazil",
  );
});

test("omite partes nulas sem deixar separadores sobrando", () => {
  const incomplete = {
    ...location({ city: null }),
    region: null,
  } as unknown as ServiceLocation;

  assert.equal(formatServicePlace(incomplete), "Brazil");
});

test("usa um texto de fallback quando não há nenhuma parte", () => {
  const empty = {
    ...location({}),
    city: null,
    region: null,
    country: null,
  } as unknown as ServiceLocation;

  assert.equal(formatServicePlace(empty), "Localização não informada");
});

test("descarta espaços em branco das partes da localização", () => {
  assert.equal(
    formatServicePlace(location({ city: "  ", region: " Sudeste " })),
    "Sudeste · Brazil",
  );
});

test("considera coordenadas apenas quando latitude e longitude existem", () => {
  assert.equal(hasServiceCoordinates(location({})), true);
  assert.equal(
    hasServiceCoordinates(location({ latitude: null })),
    false,
  );
  assert.equal(
    hasServiceCoordinates(location({ longitude: null })),
    false,
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildServiceFeatureCollection } from "../src/lib/serviceGeoJson.ts";
import type { MonitoredService } from "../src/types/service.ts";

const service: MonitoredService = {
  id: "api",
  serviceId: 1,
  name: "API",
  status: "active",
  location: {
    region_code: "BR-SP",
    country: "Brasil",
    region: "São Paulo",
    city: "São Paulo",
    latitude: -23.55,
    longitude: -46.63,
  },
};

test("gera ponto GeoJSON com longitude antes de latitude e marca seleção", () => {
  const result = buildServiceFeatureCollection([service], "api");

  assert.equal(result.type, "FeatureCollection");
  assert.equal(result.features.length, 1);
  assert.deepEqual(result.features[0].geometry.coordinates, [-46.63, -23.55]);
  assert.equal(result.features[0].properties.selected, true);
  assert.equal(result.features[0].properties.status, "active");
});

test("ignora serviços sem coordenadas ou com coordenadas fora dos limites", () => {
  const result = buildServiceFeatureCollection([
    { ...service, id: "missing", location: { ...service.location, latitude: null } },
    { ...service, id: "nan", location: { ...service.location, longitude: Number.NaN } },
    { ...service, id: "invalid", location: { ...service.location, latitude: 91 } },
  ]);

  assert.equal(result.features.length, 0);
});

test("mantém o ponto válido quando outro serviço está sem coordenadas", () => {
  // O serviço incompleto vem primeiro para verificar que ele não impede o processamento do próximo.
  const incompleteService: MonitoredService = {
    ...service,
    id: "missing",
    serviceId: 2,
    location: { ...service.location, latitude: null, longitude: null },
  };

  const result = buildServiceFeatureCollection([incompleteService, service]);

  // Apenas o serviço com localização válida deve permanecer entre os pontos do mapa.
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.serviceId, service.id);
  assert.deepEqual(result.features[0].geometry.coordinates, [-46.63, -23.55]);
});

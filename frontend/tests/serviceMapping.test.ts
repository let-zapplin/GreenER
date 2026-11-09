import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getMonitoringStatus,
  storedServiceToService,
} from "../src/services/serviceMapping.ts";
import type { StoredService } from "../src/types/service.ts";

const stored: StoredService = {
  id_service: 1,
  external_id: "billing-api",
  name: "Billing API",
  region_code: "br-sudeste",
  country: "Brazil",
  region: "Sudeste",
  city: "Sao Paulo",
  latitude: -23.55,
  longitude: -46.63,
  status: "active",
  last_seen_at: "2026-10-29T12:00:00.000Z",
  last_collection_status: "no_metrics",
  last_collection_at: "2026-10-29T12:01:00.000Z",
};

test("serviço ativo sem métricas mantém estado próprio e continua listado", () => {
  assert.equal(getMonitoringStatus(stored), "no_metrics");

  const service = storedServiceToService(stored);

  assert.equal(service.id, "billing-api");
  assert.equal(service.status, "no_metrics");
  assert.equal(service.lastCollectionAt, "2026-10-29T12:01:00.000Z");
});

test("indisponibilidade não é confundida com ausência de métricas", () => {
  assert.equal(
    getMonitoringStatus({ ...stored, last_collection_status: "unavailable" }),
    "unavailable",
  );
});

test("remoção no catálogo prevalece sobre o estado da coleta", () => {
  assert.equal(
    getMonitoringStatus({ ...stored, status: "removed" }),
    "removed",
  );
});

test("coleta com sucesso ou ainda não realizada mantém o serviço ativo", () => {
  assert.equal(
    getMonitoringStatus({ ...stored, last_collection_status: "success" }),
    "active",
  );
  assert.equal(
    getMonitoringStatus({ ...stored, last_collection_status: null }),
    "active",
  );
});

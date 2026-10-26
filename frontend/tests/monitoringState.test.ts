import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearMonitoringSnapshot,
  getMonitoringSnapshot,
  reconcileServices,
  recordDiscovery,
} from "../src/services/monitoringState.ts";
import type { MonitoredService } from "../src/types/service.ts";

const service: MonitoredService = {
  id: "api",
  name: "API",
  metrics_path: "/metrics/api",
  status: "active",
  location: {
    region_code: "BR-SP",
    country: "Brasil",
    region: "São Paulo",
    city: null,
    latitude: null,
    longitude: null,
  },
};

test("a primeira descoberta estabelece os serviços ativos", () => {
  assert.equal(reconcileServices([], [service], false)[0].status, "active");
});

test("serviços que surgem após uma consulta vazia são novos", () => {
  assert.equal(reconcileServices([], [service], true)[0].status, "new");
});

test("o status removido do backend é preservado e o retorno atualiza os metadados", () => {
  const previous: MonitoredService = { ...service, status: "active" };
  const removed = reconcileServices(
    [previous],
    [{ ...service, status: "removed" }],
    true,
  );
  assert.deepEqual(removed, [{ ...service, status: "removed" }]);
  const returned = reconcileServices(
    removed,
    [{ ...service, name: "API atualizada" }],
    true,
    10_000,
  );
  assert.equal(returned[0].status, "returned");
  assert.equal(returned[0].name, "API atualizada");
  assert.equal(
    reconcileServices(returned, [service], true, 13_000)[0].status,
    "active",
  );
});

for (const status of ["new", "returned"] as const) {
  test(`${status} permanece por 3 segundos sem renovar o prazo a cada consulta`, () => {
    const highlighted: MonitoredService = {
      ...service,
      status,
      statusExpiresAt: 13_000,
    };
    const firstRefresh = reconcileServices(
      [highlighted],
      [{ ...service, name: "Nome atualizado" }],
      true,
      11_000,
    );
    assert.equal(firstRefresh[0].status, status);
    assert.equal(firstRefresh[0].name, "Nome atualizado");
    assert.equal(firstRefresh[0].statusExpiresAt, 13_000);
    const beforeExpiry = reconcileServices(
      firstRefresh,
      [service],
      true,
      12_999,
    );
    assert.equal(beforeExpiry[0].status, status);
    const expired = reconcileServices(beforeExpiry, [service], true, 13_000);
    assert.equal(expired[0].status, "active");
    assert.equal(expired[0].statusExpiresAt, undefined);
  });

  test(`remoção interrompe ${status} imediatamente e o retorno inicia novo prazo`, () => {
    const highlighted: MonitoredService = {
      ...service,
      status,
      statusExpiresAt: 13_000,
    };
    const removed = reconcileServices(
      [highlighted],
      [{ ...service, status: "removed" }],
      true,
      11_000,
    );
    assert.equal(removed[0].status, "removed");
    assert.equal(removed[0].statusExpiresAt, undefined);
    const returned = reconcileServices(removed, [service], true, 11_500);
    assert.equal(returned[0].status, "returned");
    assert.equal(returned[0].statusExpiresAt, 14_500);
  });
}

test("novos serviços recebem prazo contado a partir da descoberta", () => {
  const discovered = reconcileServices([], [service], true, 10_000);
  assert.equal(discovered[0].statusExpiresAt, 13_000);
});

test("a última leitura válida é preservada enquanto o backend informa remoção", () => {
  const initial = reconcileServices([], [service], false, 10_000);
  assert.equal(
    initial[0].lastConfirmedAt,
    new Date(10_000).toISOString(),
  );

  const confirmed = reconcileServices(
    initial,
    [service],
    true,
    11_000,
  );

  assert.equal(
    confirmed[0].lastConfirmedAt,
    new Date(11_000).toISOString(),
  );

  const storedRemoved: MonitoredService = {
    ...service,
    status: "removed",
    lastConfirmedAt: confirmed[0].lastConfirmedAt,
  };

  const removed = reconcileServices(
    confirmed,
    [storedRemoved],
    true,
    12_000,
  );

  assert.equal(
    removed[0].lastConfirmedAt,
    confirmed[0].lastConfirmedAt,
  );

  assert.equal(
    reconcileServices(removed, [storedRemoved], true, 15_000)[0]
      .lastConfirmedAt,
    confirmed[0].lastConfirmedAt,
  );

  const returned = reconcileServices(
    removed,
    [service],
    true,
    16_000,
  );

  assert.equal(
    returned[0].lastConfirmedAt,
    new Date(16_000).toISOString(),
  );

  assert.equal(returned[0].status, "returned");
});

test("a lista do backend determina quais serviços continuam no monitoramento", () => {
  const previous: MonitoredService = { ...service, status: "active" };
  const added = { ...service, id: "worker", name: "Worker" };
  const result = reconcileServices([previous], [added], true);
  assert.deepEqual(
    result.map(({ id, status }) => ({ id, status })),
    [{ id: "worker", status: "new" }],
  );
});

test("o histórico e o horário permanecem disponíveis ao remontar a tela", () => {
  clearMonitoringSnapshot();
  recordDiscovery([]);
  const successful = recordDiscovery([service]);
  assert.equal(successful.services[0].status, "new");
  assert.ok(
    successful.lastUpdated && !Number.isNaN(Date.parse(successful.lastUpdated)),
  );
  // Reading the snapshot on another mount must not reset successful discoveries.
  assert.strictEqual(getMonitoringSnapshot(), successful);
  const removed = recordDiscovery([{ ...service, status: "removed" }]);
  assert.equal(getMonitoringSnapshot().services[0].status, "removed");
  assert.strictEqual(getMonitoringSnapshot(), removed);
  assert.equal(recordDiscovery([service]).services[0].status, "returned");
});

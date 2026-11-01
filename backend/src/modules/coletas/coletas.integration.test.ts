import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pool from "../../db/connection.js";
import { ColetasRepository } from "./coletas.repository.js";

// A suíte normal não acessa um banco real. O Compose de testes habilita esta suíte.
const enabled = process.env.RUN_DB_INTEGRATION_TESTS === "true";

describe.skipIf(!enabled)("ColetasRepository com PostgreSQL real", () => {
  const repository = new ColetasRepository();
  let locationId: number | undefined;
  let serviceId: number;
  const serviceIds: number[] = [];

  function success(cpu = 25) {
    return {
      status: "success" as const,
      data: {
        cpu_percent: cpu,
        memory_gb: 2,
        disk_gb: 10,
        network_gb: 0.5,
        collection_interval_seconds: 45,
        recorded_at: "2026-11-01T12:00:00.000Z",
      },
    };
  }

  beforeAll(async () => {
    // Verifica antes de inserir ou remover qualquer dado.
    if (
      process.env.NODE_ENV !== "test" ||
      process.env.POSTGRES_HOST !== "postgres-test" ||
      process.env.POSTGRES_DB !== "greener_test"
    ) {
      throw new Error("Execute esta suíte pelo compose.test.yaml, no banco exclusivo de testes.");
    }
    const result = await pool.query("SELECT current_database() AS name");
    expect(result.rows[0].name).toBe("greener_test");
  });

  beforeEach(async () => {
    const location = await pool.query(
      `INSERT INTO location (region_code, country, region)
       VALUES ($1, $2, $3) RETURNING id_location`,
      [`test-${randomUUID()}`, "Brasil", "Região de teste"],
    );
    locationId = location.rows[0].id_location;
    const service = await pool.query(
      `INSERT INTO service (location_id_location, id, name)
       VALUES ($1, $2, $3) RETURNING id_service`,
      [locationId, `test-${randomUUID()}`, "Serviço de integração"],
    );
    serviceId = service.rows[0].id_service;
    serviceIds.push(serviceId);
  });

  afterEach(async () => {
    // Remove somente os registros criados pelo cenário, na ordem das FKs.
    try {
      if (serviceIds.length > 0) {
        await pool.query(
          `DELETE FROM metrics WHERE collection_id_collection IN
           (SELECT id_collection FROM collection WHERE service_id_service = ANY($1::int[]))`,
          [serviceIds],
        );
        await pool.query("DELETE FROM collection WHERE service_id_service = ANY($1::int[])", [serviceIds]);
        await pool.query("DELETE FROM service WHERE id_service = ANY($1::int[])", [serviceIds]);
      }
      if (locationId !== undefined) {
        await pool.query("DELETE FROM location WHERE id_location = $1", [locationId]);
      }
    } finally {
      serviceIds.length = 0;
      locationId = undefined;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("grava e recupera métricas, datas e duração da amostra", async () => {
    await repository.saveCollection(serviceId, success());
    const history = await repository.findHistoryByService(serviceId);

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      service_id: serviceId,
      status: "success",
      cpu_percent: "25.00",
      memory_gb: 2,
      disk_gb: 10,
      network_gb: 0.5,
      collection_interval_seconds: 45,
      recorded_at: new Date("2026-11-01T12:00:00.000Z"),
      failure_reason: null,
      http_status: null,
    });
    expect(history[0].attempted_at).toBeInstanceOf(Date);
  });

  it("preserva duas coletas diferentes e retorna a mais recente primeiro", async () => {
    await repository.saveCollection(serviceId, success(25));
    const before = await repository.findHistoryByService(serviceId);
    await repository.saveCollection(serviceId, success(50));
    const after = await repository.findHistoryByService(serviceId);

    expect(after).toHaveLength(2);
    expect(after.map((row) => row.cpu_percent)).toEqual(["50.00", "25.00"]);
    expect(after[1].id_collection).toBe(before[0].id_collection);
    expect(after[0].id_collection).not.toBe(after[1].id_collection);
  });

  it("grava no_metrics sem criar uma linha de métricas", async () => {
    await repository.saveCollection(serviceId, { status: "no_metrics", http_status: 404 });
    const history = await repository.findHistoryByService(serviceId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ status: "no_metrics", http_status: 404, cpu_percent: null });
    const metrics = await pool.query(
      "SELECT id_metrics FROM metrics WHERE collection_id_collection = $1",
      [history[0].id_collection],
    );
    expect(metrics.rows).toHaveLength(0);
  });

  it("recupera o motivo e o status HTTP de indisponibilidade", async () => {
    await repository.saveCollection(serviceId, {
      status: "unavailable",
      http_status: 503,
      failure_reason: "Serviço temporariamente indisponível",
    });
    const history = await repository.findHistoryByService(serviceId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      status: "unavailable",
      http_status: 503,
      failure_reason: "Serviço temporariamente indisponível",
      cpu_percent: null,
    });
  });

  it("separa os históricos de dois serviços", async () => {
    const second = await pool.query(
      `INSERT INTO service (location_id_location, id, name)
       VALUES ($1, $2, $3) RETURNING id_service`,
      [locationId, `test-${randomUUID()}`, "Segundo serviço"],
    );
    const secondId = second.rows[0].id_service as number;
    serviceIds.push(secondId);
    await repository.saveCollection(serviceId, success(25));
    await repository.saveCollection(secondId, success(75));

    const firstHistory = await repository.findHistoryByService(serviceId);
    const secondHistory = await repository.findHistoryByService(secondId);
    expect(firstHistory).toHaveLength(1);
    expect(secondHistory).toHaveLength(1);
    expect(firstHistory[0]).toMatchObject({ service_id: serviceId, cpu_percent: "25.00" });
    expect(secondHistory[0]).toMatchObject({ service_id: secondId, cpu_percent: "75.00" });
  });

  it("desfaz a tentativa quando a inserção das métricas viola uma restrição", async () => {
    const invalid = success();
    invalid.data.collection_interval_seconds = -1;

    await expect(repository.saveCollection(serviceId, invalid)).rejects.toMatchObject({ code: "23514" });
    const collections = await pool.query(
      "SELECT id_collection FROM collection WHERE service_id_service = $1",
      [serviceId],
    );
    expect(collections.rows).toHaveLength(0);
  });

  it("permite recuperar a gravação por uma nova conexão independente", async () => {
    await repository.saveCollection(serviceId, success());
    const otherPool = new pg.Pool({
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });
    try {
      const result = await otherPool.query(
        `SELECT m.cpu_percent, m.collection_interval_seconds
         FROM collection c JOIN metrics m ON m.collection_id_collection = c.id_collection
         WHERE c.service_id_service = $1`,
        [serviceId],
      );
      expect(result.rows).toEqual([{ cpu_percent: "25.00", collection_interval_seconds: 45 }]);
    } finally {
      await otherPool.end();
    }
  });
});

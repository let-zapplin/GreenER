import pool from "./db/connection.js";
import { ColetasRepository } from "./modules/coletas/coletas.repository.js";

async function main() {
  const repository = new ColetasRepository();

  // Seleciona um serviço já cadastrado.
  const services = await pool.query(
    "SELECT id_service, name FROM service ORDER BY id_service LIMIT 1",
  );

  const service = services.rows[0];

  if (!service) {
    throw new Error(
      "Nenhum serviço cadastrado. Sincronize os serviços antes do teste.",
    );
  }

  const serviceId = service.id_service;
  console.log("Serviço usado no teste:", service);

  const before = await repository.findHistoryByService(serviceId);

  // Grava uma coleta com métricas.
  await repository.saveCollection(serviceId, {
    status: "success",
    data: {
      cpu_percent: 25,
      memory_gb: 2,
      disk_gb: 10,
      network_gb: 0.5,
      recorded_at: new Date().toISOString(),
    },
  });

  // Grava uma tentativa sem métricas.
  await repository.saveCollection(serviceId, {
    status: "no_metrics",
    http_status: 404,
  });

  const after = await repository.findHistoryByService(serviceId);

  console.log("Quantidade antes:", before.length);
  console.log("Quantidade depois:", after.length);
  console.table(after);

  // Confere a preservação dos registros anteriores.
  const previousRecordsPreserved = before.every((previous) =>
    after.some(
      (current) => current.id_collection === previous.id_collection,
    ),
  );

  if (!previousRecordsPreserved) {
    throw new Error("Registros anteriores não foram preservados.");
  }

  if (after.length < before.length + 2) {
    throw new Error("As duas novas coletas não foram encontradas.");
  }

  console.log("Teste concluído: novas coletas e histórico preservado.");
}

main()
  .catch((error) => {
    console.error("Teste falhou:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
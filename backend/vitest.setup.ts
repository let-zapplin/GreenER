// Os testes nunca alcançam as APIs externas; valores fictícios evitam que
// src/config/env.ts interrompa o carregamento do app durante a coleta.
process.env.METRICS_API_URL ??= "http://metrics.test";
process.env.CARBON_API_URL ??= "http://carbon.test";
process.env.JWT_SECRET ??= "segredo-de-teste";

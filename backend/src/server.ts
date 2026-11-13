import app from "./app.js";
import { env } from "./config/env.js";
import { startServiceSync } from "./jobs/service-sync.job.js";
import { startMetricsCollection } from "./jobs/metrics-collection.job.js";
import { startCarbonIntensitySync } from "./jobs/carbon-intensity-sync.job.js";
import { OllamaClient } from "./modules/chat/ollama.client.js";

const port = env.port;

app.listen(port, "0.0.0.0", () => {
  console.log(`GreenER backend rodando na porta ${port}`);

  void startServiceSync();
  void startMetricsCollection();
  void startCarbonIntensitySync();

  // Pré-aquece o modelo em segundo plano. Se o Ollama ainda não estiver
  // pronto, o assistente segue no modo regras.
  void new OllamaClient().warmup();
});

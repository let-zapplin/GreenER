import assert from "node:assert/strict";
import { test } from "node:test";

import { buildComparisonSeries } from "../src/lib/comparisonSeries.ts";

import type {
  IndicatorSample,
  ServiceIndicatorHistoryResponse,
} from "../src/types/indicators.ts";

// Cria uma amostra válida como base.
// Cada teste pode substituir apenas os campos necessários.
function createSample(changes: Partial<IndicatorSample> = {}): IndicatorSample {
  return {
    collectionId: "collection-1",
    attemptedAt: "2026-11-19T10:00:00.000Z",
    status: "success",
    metrics: {
      cpuPercent: 50,
      memoryGb: 2,
      diskGb: 10,
      networkGb: 1,
    },
    collectionIntervalSeconds: 60,
    energyKwh: 0.02,
    emissionsGco2e: 4,
    carbonIntensityGco2ePerKwh: 200,
    gapReason: null,
    ...changes,
  };
}

// Monta o histórico recebido pela função de comparação.
// O intervalo de exibição escolhido para os testes é de um minuto.
function createHistory(
  samples: IndicatorSample[],
  serviceId = 1,
): ServiceIndicatorHistoryResponse {
  return {
    message: "Histórico de teste",
    period: {
      start: "2026-11-19T10:00:00.000Z",
      end: "2026-11-19T11:00:00.000Z",
      collectionIntervalMs: 60_000,
      displayIntervalMs: 60_000,
    },
    service: {
      serviceId,
      name: `Serviço ${serviceId}`,
      status: "active",
      regionCode: "BR-SP",
    },
    samples,
  };
}

test("mantém valor ausente e motivo da lacuna sem transformar em zero", () => {
  const history = createHistory([
    createSample({
      status: "unavailable",
      metrics: null,
      energyKwh: null,
      emissionsGco2e: null,
      carbonIntensityGco2ePerKwh: null,
      gapReason: "unavailable",
    }),
  ]);

  const result = buildComparisonSeries([history], "energy");

  assert.equal(result[0].points.length, 1);
  assert.equal(result[0].points[0].value, null);
  assert.equal(result[0].points[0].gapReason, "unavailable");
});

test("preserva energia quando falta intensidade de carbono", () => {
  const history = createHistory([
    createSample({
      emissionsGco2e: null,
      carbonIntensityGco2ePerKwh: null,
      gapReason: "carbon_intensity_unavailable",
    }),
  ]);

  const energy = buildComparisonSeries([history], "energy");
  const emissions = buildComparisonSeries([history], "emissions");

  // A energia existe, mas a emissão não pode ser calculada.
  assert.equal(energy[0].points[0].value, 0.02);
  assert.equal(emissions[0].points[0].value, null);
  assert.equal(
    emissions[0].points[0].gapReason,
    "carbon_intensity_unavailable",
  );
});

test("insere gap temporal entre amostras distantes e preserva os pontos reais", () => {
  const history = createHistory([
    createSample(),
    createSample({
      collectionId: "collection-2",
      attemptedAt: "2026-11-19T10:03:00.000Z",
      energyKwh: 0.03,
    }),
  ]);

  const result = buildComparisonSeries([history], "energy");
  const points = result[0].points;

  // Três minutos ultrapassam o limite de 2,5 intervalos de um minuto.
  assert.equal(points.length, 3);
  assert.equal(points[0].value, 0.02);
  assert.equal(points[1].value, null);
  assert.equal(points[1].temporalGap, true);
  assert.equal(points[1].attemptedAt, "2026-11-19T10:01:00.000Z");
  assert.equal(points[2].value, 0.03);
});

test("não insere gap temporal no limite de 2,5 intervalos", () => {
  const history = createHistory([
    createSample(),
    createSample({
      collectionId: "collection-2",
      attemptedAt: "2026-11-19T10:02:30.000Z",
    }),
  ]);

  const result = buildComparisonSeries([history], "energy");

  // O limite é de 150 segundos; somente valores maiores geram o gap.
  assert.equal(result[0].points.length, 2);
  assert.equal(
    result[0].points.some((point) => point.temporalGap === true),
    false,
  );
});

test("mantém os pontos válidos de outro serviço quando um possui lacuna", () => {
  const incompleteHistory = createHistory(
    [
      createSample({
        status: "no_metrics",
        metrics: null,
        energyKwh: null,
        emissionsGco2e: null,
        carbonIntensityGco2ePerKwh: null,
        gapReason: "no_metrics",
      }),
    ],
    1,
  );

  const validHistory = createHistory([createSample()], 2);

  const result = buildComparisonSeries(
    [incompleteHistory, validHistory],
    "energy",
  );

  assert.equal(result.length, 2);

  assert.equal(result[0].serviceId, 1);
  assert.equal(result[0].points[0].value, null);

  assert.equal(result[1].serviceId, 2);
  assert.equal(result[1].points.length, 1);
  assert.equal(result[1].points[0].value, 0.02);
});

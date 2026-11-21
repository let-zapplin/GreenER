import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createAnalysisPeriodWindow,
  isSupportedAnalysisPeriod,
} from "../src/services/analysisPeriod.ts";

const HOUR_MS = 60 * 60 * 1000;

test("reconhece os filtros de 1h, 6h, 24h e 7d", () => {
  for (const durationMs of [HOUR_MS, 6 * HOUR_MS, 24 * HOUR_MS, 168 * HOUR_MS]) {
    assert.equal(isSupportedAnalysisPeriod(durationMs), true);
  }
});

test("rejeita durações que não correspondem aos filtros disponíveis", () => {
  // A validação dos filtros deve impedir durações arbitrárias ou inválidas.
  for (const durationMs of [0, -HOUR_MS, 2 * HOUR_MS, Number.NaN, Infinity]) {
    assert.equal(isSupportedAnalysisPeriod(durationMs), false);
  }
});

test("calcula início e fim dos quatro filtros a partir do horário informado", () => {
  // Datas fixas tornam o teste independente do horário de execução.
  const end = "2026-11-21T12:00:00.000Z";
  const cases = [
    { durationMs: HOUR_MS, start: "2026-11-21T11:00:00.000Z" },
    { durationMs: 6 * HOUR_MS, start: "2026-11-21T06:00:00.000Z" },
    { durationMs: 24 * HOUR_MS, start: "2026-11-20T12:00:00.000Z" },
    { durationMs: 168 * HOUR_MS, start: "2026-11-14T12:00:00.000Z" },
  ];

  for (const { durationMs, start } of cases) {
    const result = createAnalysisPeriodWindow(durationMs, Date.parse(end));

    assert.deepEqual(result, { start, end, durationMs });
  }
});

test("mantém a janela correta ao atravessar a meia-noite e mudar de mês", () => {
  const result = createAnalysisPeriodWindow(
    HOUR_MS,
    Date.parse("2026-12-01T00:30:00.000Z"),
  );

  // O início pertence ao dia e mês anteriores, sem alterar a duração de uma hora.
  assert.deepEqual(result, {
    start: "2026-11-30T23:30:00.000Z",
    end: "2026-12-01T00:30:00.000Z",
    durationMs: HOUR_MS,
  });
});

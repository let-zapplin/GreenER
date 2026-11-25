import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GRID_COLS,
  MONITORING_WIDGETS,
  defaultWidgets,
  fixedPages,
  isDefaultLayout,
  isMonitoringWidgetType,
  newWidgetId,
  overlaps,
  widgetSpec,
  type MonitoringWidgetType,
} from "../src/lib/monitoringBoard.ts";

const TYPES: MonitoringWidgetType[] = [
  "map",
  "region",
  "services",
  "summary",
  "ranking",
  "history",
  "comparison",
  "projection",
];

test("o catálogo traz exatamente os tipos que o painel sabe montar", () => {
  assert.deepEqual(
    MONITORING_WIDGETS.map((spec) => spec.type),
    TYPES,
  );

  assert.equal(
    new Set(MONITORING_WIDGETS.map((spec) => spec.type)).size,
    MONITORING_WIDGETS.length,
  );
});

test("todo tipo tem rótulo, kind e tamanho coerente", () => {
  for (const spec of MONITORING_WIDGETS) {
    assert.equal(spec.label.trim().length > 0, true);
    assert.equal(
      ["visualizacao", "indicador"].includes(spec.kind),
      true,
    );
    assert.equal(spec.w <= GRID_COLS, true);
    assert.equal(spec.minW >= 1 && spec.minW <= spec.w, true);
    assert.equal(spec.minH >= 1 && spec.minH <= spec.h, true);
  }
});

test("widgetSpec e o guarda trabalham com o mesmo catálogo", () => {
  for (const type of TYPES) {
    assert.equal(isMonitoringWidgetType(type), true);
    assert.equal(widgetSpec(type).type, type);
    assert.equal(widgetSpec(type) === widgetSpec(type), true);
  }

  for (const lixo of ["analise", "mapa", "", null, 3, undefined, {}]) {
    assert.equal(isMonitoringWidgetType(lixo), false);
  }
});

test("newWidgetId identifica o tipo e não repete", () => {
  const first = newWidgetId("ranking");
  const second = newWidgetId("ranking");

  assert.equal(first.startsWith("ranking-"), true);
  assert.equal(second.startsWith("ranking-"), true);
  assert.notEqual(first, second);
});

test("a página fixa usa tipos do catálogo, no tamanho mínimo de cada um", () => {
  const [monitoramento] = fixedPages();

  assert.equal(monitoramento.widgets.length > 0, true);

  for (const widget of monitoramento.widgets) {
    assert.equal(isMonitoringWidgetType(widget.type), true);

    const spec = widgetSpec(widget.type);

    assert.equal(widget.w >= spec.minW, true);
    assert.equal(widget.h >= spec.minH, true);
    assert.equal(widget.x + widget.w <= GRID_COLS, true);
  }

  for (const a of monitoramento.widgets) {
    for (const b of monitoramento.widgets) {
      if (a !== b) assert.equal(overlaps(a, b), false);
    }
  }
});

test("o arranjo padrão é reconhecido como padrão", () => {
  for (const widget of defaultWidgets()) {
    assert.equal(isMonitoringWidgetType(widget.type), true);
  }

  assert.equal(isDefaultLayout(defaultWidgets()), true);

  const moved = defaultWidgets();
  moved[0] = { ...moved[0], x: 1 };

  assert.equal(isDefaultLayout(moved), false);
});

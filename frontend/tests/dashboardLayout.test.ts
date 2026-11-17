import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeWidgetPlacements,
  moveWidget,
  moveWidgetBy,
  type WidgetSize,
} from "../src/lib/dashboardLayout.ts";

type Id = "map" | "region" | "services";

const sizes: Record<Id, WidgetSize> = {
  map: "primary",
  region: "secondary",
  services: "full",
};

const spans = (order: Id[], collapsed: Id[] = []) =>
  computeWidgetPlacements(order, sizes, new Set(collapsed)).map(
    ({ id, span, row }) => [id, span, row],
  );

test("moveWidget reposiciona e mantém os demais na ordem", () => {
  assert.deepEqual(moveWidget(["a", "b", "c"], "c", 0), ["c", "a", "b"]);
  assert.deepEqual(moveWidget(["a", "b", "c"], "a", 2), ["b", "c", "a"]);
});

test("moveWidget limita o destino e ignora ids desconhecidos", () => {
  assert.deepEqual(moveWidget(["a", "b"], "a", 99), ["b", "a"]);
  assert.deepEqual(moveWidget(["a", "b"], "b", -5), ["b", "a"]);
  assert.deepEqual(moveWidget(["a", "b"], "z", 0), ["a", "b"]);
});

test("moveWidgetBy desloca relativamente e para nas bordas", () => {
  assert.deepEqual(moveWidgetBy(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.deepEqual(moveWidgetBy(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
});

test("layout padrão: mapa e região dividem a linha, serviços abaixo", () => {
  assert.deepEqual(spans(["map", "region", "services"]), [
    ["map", 8, 0],
    ["region", 4, 0],
    ["services", 12, 1],
  ]);
});

test("ordem invertida preserva as proporções", () => {
  assert.deepEqual(spans(["region", "map", "services"]), [
    ["region", 4, 0],
    ["map", 8, 0],
    ["services", 12, 1],
  ]);
});

test("widget sozinho na linha cresce para não deixar buraco", () => {
  assert.deepEqual(spans(["map", "services", "region"]), [
    ["map", 12, 0],
    ["services", 12, 1],
    ["region", 12, 2],
  ]);
});

test("widget minimizado vira barra inteira e o vizinho ocupa a linha", () => {
  assert.deepEqual(spans(["map", "region", "services"], ["region"]), [
    ["map", 12, 0],
    ["region", 12, 1],
    ["services", 12, 2],
  ]);
});

test("toda linha soma exatamente 12 colunas", () => {
  const orders: Id[][] = [
    ["map", "region", "services"],
    ["services", "region", "map"],
    ["region", "services", "map"],
  ];

  for (const order of orders) {
    for (const collapsed of [[], ["map"], ["services"]] as Id[][]) {
      const rows = new Map<number, number>();

      for (const p of computeWidgetPlacements(
        order,
        sizes,
        new Set(collapsed),
      )) {
        rows.set(p.row, (rows.get(p.row) ?? 0) + p.span);
      }

      for (const total of rows.values()) {
        assert.equal(total, 12);
      }
    }
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FIXED_PAGE_ANALISE,
  FIXED_PAGE_MONITORAMENTO,
  GRID_COLS,
  addWidget,
  applyLayout,
  bottom,
  collapseWidget,
  columnsFor,
  defaultBoard,
  defaultWidgets,
  fitRect,
  fixedPages,
  freeSpot,
  isDefaultLayout,
  isFixedPage,
  layoutFor,
  normalizeBoard,
  overlaps,
  parseBoard,
  placeWidget,
  reflow,
  resizeRect,
  resolveLayout,
  type BoardWidget,
} from "../src/lib/monitoringBoard.ts";

const widget = (
  id: string,
  type: BoardWidget["type"],
  x: number,
  y: number,
  w: number,
  h: number,
): BoardWidget => ({ id, type, x, y, w, h });

/** Página comum (editável) para testar as regras da grade. */
const pageWithDefaults = () => ({
  id: "p",
  name: "P",
  widgets: defaultWidgets(),
});

test("a grade cai para 6 e 3 colunas conforme a janela encolhe", () => {
  assert.equal(columnsFor(1200), GRID_COLS);
  assert.equal(columnsFor(900), GRID_COLS);
  assert.equal(columnsFor(500), 6);
  assert.equal(columnsFor(400), 6);
  assert.equal(columnsFor(380), 3);
});

test("fitRect mantém o bloco dentro da grade e do tamanho mínimo", () => {
  assert.deepEqual(fitRect({ x: 10, y: 0, w: 8, h: 5 }, "map"), {
    x: 4,
    y: 0,
    w: 8,
    h: 5,
  });

  assert.deepEqual(fitRect({ x: 0, y: -3, w: 1, h: 1 }, "region"), {
    x: 0,
    y: 0,
    w: 3,
    h: 3,
  });

  assert.deepEqual(fitRect({ x: 0, y: 0, w: 8, h: 5 }, "map", 6), {
    x: 0,
    y: 0,
    w: 6,
    h: 5,
  });
});

test("overlaps e bottom medem retângulos em células", () => {
  const a = widget("a", "map", 0, 0, 8, 5);
  const b = widget("b", "region", 8, 0, 4, 5);

  assert.equal(overlaps(a, b), false);
  assert.equal(overlaps({ ...a, w: 9 }, b), true);
  assert.equal(bottom([a, b]), 5);
});

test("resolveLayout empurra o que colide e fecha o buraco acima", () => {
  const a = widget("a", "region", 0, 3, 4, 2);
  const b = widget("b", "region", 0, 0, 4, 1);

  const resolved = resolveLayout([a, b]);
  const byId = new Map(resolved.map((item) => [item.id, item]));

  assert.equal(byId.get("b")!.y, 0);
  assert.equal(byId.get("a")!.y, 1);
});

test("placeWidget move um bloco e abre espaço sem sobrepor", () => {
  const moved = placeWidget(
    defaultWidgets(),
    widget("services", "services", 0, 0, 12, 2),
  );

  const byId = new Map(moved.map((item) => [item.id, item]));

  assert.deepEqual(
    { x: byId.get("services")!.x, y: byId.get("services")!.y },
    { x: 0, y: 0 },
  );

  assert.equal(byId.get("map")!.y, 2);
  assert.equal(byId.get("region")!.y, 2);
  assert.equal(bottom(moved), 7);

  for (const a of moved) {
    for (const b of moved) {
      if (a !== b) assert.equal(overlaps(a, b), false);
    }
  }
});

test("freeSpot encontra a primeira linha livre", () => {
  const spot = freeSpot([{ x: 0, y: 0, w: 12, h: 2 }], 4, 3);

  assert.deepEqual(spot, { x: 0, y: 2 });
});

test("reflow derrama o arranjo largo em menos colunas", () => {
  const narrow = reflow(defaultWidgets(), 6);
  const byId = new Map(narrow.map((item) => [item.id, item]));

  assert.deepEqual(byId.get("map"), widget("map", "map", 0, 0, 6, 5));
  assert.deepEqual(
    byId.get("region"),
    widget("region", "region", 0, 5, 4, 5),
  );
  assert.deepEqual(
    byId.get("services"),
    widget("services", "services", 0, 10, 6, 2),
  );
});

test("redimensionar respeita a borda oposta e o mínimo", () => {
  const start = { x: 0, y: 0, w: 8, h: 5 };

  assert.deepEqual(resizeRect(start, "se", 2, 3, "map"), {
    x: 0,
    y: 0,
    w: 10,
    h: 8,
  });

  assert.deepEqual(resizeRect(start, "e", 10, 0, "map"), {
    x: 0,
    y: 0,
    w: 12,
    h: 5,
  });

  assert.deepEqual(
    resizeRect({ x: 4, y: 2, w: 6, h: 4 }, "w", 10, 0, "map"),
    { x: 6, y: 2, w: 4, h: 4 },
  );

  assert.deepEqual(
    resizeRect({ x: 2, y: 2, w: 4, h: 4 }, "n", 0, 5, "map"),
    { x: 2, y: 3, w: 4, h: 3 },
  );
});

test("minimizar guarda a altura e restaurar devolve o tamanho", () => {
  const collapsed = collapseWidget(defaultWidgets(), "map");

  const map = collapsed.find((item) => item.id === "map")!;

  assert.equal(map.h, 1);
  assert.equal(map.collapsed, true);
  assert.equal(map.expandedH, 5);

  const restored = collapseWidget(collapsed, "map");
  const back = restored.find((item) => item.id === "map")!;

  assert.equal(back.h, 5);
  assert.equal(back.collapsed, undefined);
  assert.equal(back.expandedH, undefined);
});

test("adicionar no ponto escolhido mantém o bloco e empurra os demais", () => {
  const next = addWidget(defaultWidgets(), "summary", { x: 0, y: 0 }, 12, "resumo");

  const summary = next.find((item) => item.id === "resumo")!;

  assert.deepEqual(
    { x: summary.x, y: summary.y, w: summary.w, h: summary.h },
    { x: 0, y: 0, w: 4, h: 3 },
  );

  assert.equal(
    next.some((item) => item.id === "resumo" && item.type === "summary"),
    true,
  );
});

test("applyLayout em 12 colunas grava o arranjo principal", () => {
  const page = pageWithDefaults();

  const next = placeWidget(
    page.widgets,
    widget("services", "services", 0, 0, 12, 2),
  );

  const updated = applyLayout(page, 12, next);

  assert.deepEqual(updated.widgets, next);
  assert.equal(updated.layouts, undefined);
  assert.notDeepEqual(page.widgets, next);
});

test("applyLayout estreito mantém o arranjo largo e guarda o da largura", () => {
  const page = pageWithDefaults();

  const next = layoutFor(page, 6).map((item) =>
    item.id === "services" ? { ...item, h: 3 } : item,
  );

  const updated = applyLayout(page, 6, next);

  assert.deepEqual(updated.widgets, page.widgets);
  assert.equal(updated.layouts?.[6]?.find((w) => w.id === "services")?.h, 3);
  assert.equal(updated.layouts?.[3], undefined);
});

test("applyLayout estreito propaga bloco novo para o arranjo largo", () => {
  const page = pageWithDefaults();

  const narrow = addWidget(
    layoutFor(page, 6),
    "summary",
    { x: 0, y: 12 },
    6,
    "resumo",
  );

  const updated = applyLayout(page, 6, narrow);
  const summary = updated.widgets.find((item) => item.id === "resumo")!;

  assert.deepEqual(
    { x: summary.x, y: summary.y, w: summary.w, h: summary.h },
    { x: 0, y: 7, w: 4, h: 3 },
  );

  assert.equal(updated.layouts?.[6]?.some((w) => w.id === "resumo"), true);
});

test("applyLayout estreito propaga bloco removido para todos os arranjos", () => {
  const page = pageWithDefaults();

  const narrow = layoutFor(page, 6).filter((item) => item.id !== "region");
  const updated = applyLayout(page, 6, narrow);

  assert.equal(updated.widgets.some((item) => item.id === "region"), false);
  assert.equal(updated.layouts?.[6]?.some((item) => item.id === "region"), false);
});

test("em 3 colunas nenhum bloco ultrapassa a grade", () => {
  const page = pageWithDefaults();

  const next = addWidget(layoutFor(page, 3), "map", undefined, 3, "mapa-2");

  assert.equal(next.every((item) => item.w <= 3), true);
  assert.equal(next.every((item) => item.x + item.w <= 3), true);

  const summary = addWidget(layoutFor(page, 3), "summary", undefined, 3, "resumo");

  assert.equal(summary.filter((item) => item.id === "resumo").length, 1);
});

test("freeSpot não trava quando o bloco é mais largo que a grade", () => {
  assert.deepEqual(freeSpot([], 8, 2, 3), { x: 0, y: 0 });
});

test("parseBoard descarta conteúdo ilegível e nunca lança", () => {
  assert.equal(parseBoard(null), null);
  assert.equal(parseBoard("{"), null);
  assert.equal(parseBoard('{"pages":[]}'), null);
  assert.equal(parseBoard('{"pages":[{"id":"p"}]}'), null);
});

test("parseBoard corrige limites, colapsos e blocos desconhecidos", () => {
  const board = parseBoard(
    JSON.stringify({
      pages: [
        {
          id: "p1",
          name: "  ",
          widgets: [
            { id: "map", type: "map", x: 10, y: 0, w: 8, h: 5 },
            {
              id: "region",
              type: "region",
              x: 0,
              y: 0,
              w: 4,
              h: 5,
              collapsed: true,
              expandedH: 7,
            },
            { id: "x", type: "grafico", x: 0, y: 0, w: 4, h: 4 },
          ],
        },
      ],
      activePageId: "inexistente",
    }),
  )!;

  const page = board.pages[0];
  const byId = new Map(page.widgets.map((item) => [item.id, item]));

  assert.equal(page.name, "Página");
  assert.equal(board.activePageId, "p1");
  assert.equal(page.widgets.length, 2);

  assert.equal(byId.get("map")!.x, 4);
  assert.equal(byId.get("map")!.w, 8);

  assert.equal(byId.get("region")!.h, 1);
  assert.equal(byId.get("region")!.collapsed, true);
  assert.equal(byId.get("region")!.expandedH, 7);
});

test("isDefaultLayout reconhece o arranjo inicial e qualquer mudança", () => {
  assert.equal(isDefaultLayout(defaultWidgets()), true);

  const moved = defaultWidgets();
  moved[0] = { ...moved[0], y: 1 };

  assert.equal(isDefaultLayout(moved), false);
});

test("o painel nasce com Monitoramento e Análise fixas, nessa ordem", () => {
  const board = defaultBoard();

  assert.deepEqual(
    board.pages.map((page) => page.name),
    ["Monitoramento", "Análise"],
  );

  assert.equal(board.activePageId, FIXED_PAGE_MONITORAMENTO);
  assert.equal(isFixedPage(FIXED_PAGE_MONITORAMENTO), true);
  assert.equal(isFixedPage(FIXED_PAGE_ANALISE), true);
  assert.equal(isFixedPage("page-visao-geral"), false);
});

test("as páginas fixas têm arranjo válido, sem sobreposição", () => {
  const monitoramento = fixedPages()[0];
  const analise = fixedPages()[1];

  assert.deepEqual(
    monitoramento.widgets.map((item) => item.type),
    ["map", "region", "services", "summary"],
  );

  assert.deepEqual(
    analise.widgets.map((item) => item.type),
    ["ranking", "history", "comparison", "projection"],
  );

  for (const page of [monitoramento, analise]) {
    for (const item of page.widgets) {
      assert.equal(item.x + item.w <= GRID_COLS, true);
    }

    for (const a of page.widgets) {
      for (const b of page.widgets) {
        if (a !== b) assert.equal(overlaps(a, b), false);
      }
    }
  }
});

test("normalizeBoard põe as fixas na frente e preserva páginas criadas", () => {
  const stored = {
    pages: [
      {
        id: "page-visao-geral",
        name: "Visão geral",
        widgets: defaultWidgets(),
      },
      {
        id: FIXED_PAGE_ANALISE,
        name: "Tentativa",
        widgets: [],
      },
    ],
    activePageId: "page-visao-geral",
  };

  const board = normalizeBoard(stored);

  assert.deepEqual(
    board.pages.map((page) => page.id),
    [FIXED_PAGE_MONITORAMENTO, FIXED_PAGE_ANALISE, "page-visao-geral"],
  );

  assert.equal(board.activePageId, "page-visao-geral");
  assert.equal(board.pages[1].name, "Análise");
  assert.equal(board.pages[1].widgets.length, 4);
  assert.equal(board.pages[2].widgets.length, 3);
});

test("normalizeBoard cai na primeira fixa quando a ativa não existe", () => {
  const board = normalizeBoard({
    pages: [
      { id: "custom", name: "Minha página", widgets: [] },
    ],
    activePageId: "sumiu",
  });

  assert.equal(board.activePageId, FIXED_PAGE_MONITORAMENTO);
  assert.equal(board.pages.length, 3);
});

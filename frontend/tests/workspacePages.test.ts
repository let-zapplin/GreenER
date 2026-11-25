import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOARD_STORAGE_KEY,
  FIXED_PAGE_MONITORAMENTO,
  defaultBoard,
  defaultWidgets,
  fixedPages,
  isFixedPage,
  loadBoard,
  newPage,
  normalizeBoard,
  saveBoard,
  type Board,
  type BoardPage,
} from "../src/lib/monitoringBoard.ts";

/**
 * O storage do navegador não existe no Node, então entra um falso no
 * global antes de cada teste de persistência. O retorno devolve o global.
 */
function useStorage(
  initial: Record<string, string> = {},
  broken = false,
) {
  const store = new Map(Object.entries(initial));
  const previous = Reflect.get(globalThis, "localStorage");

  const fake = {
    getItem: (key: string) => {
      if (broken) throw new Error("storage indisponível");
      return store.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (broken) throw new Error("storage indisponível");
      store.set(key, value);
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: fake,
  });

  return () => {
    if (previous === undefined) delete globalThis.localStorage;
    else
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previous,
      });
  };
}

const userPage = (name = "Visão geral"): BoardPage => ({
  id: "page-visao-geral",
  name,
  widgets: [
    { id: "map", type: "map", x: 0, y: 0, w: 8, h: 5 },
    { id: "summary", type: "summary", x: 8, y: 0, w: 4, h: 3 },
  ],
});

test("a página fixa é devolvida como cópia, nunca como referência", () => {
  const first = fixedPages();
  first[0].name = "Apaguei a fixa";
  first[0].widgets[0].w = 1;

  const second = fixedPages();

  assert.equal(second[0].name, "Monitoramento");
  assert.equal(second[0].widgets[0].w, 8);
});

test("Monitoramento é a única página fixa do painel", () => {
  assert.deepEqual(
    fixedPages().map((page) => page.id),
    [FIXED_PAGE_MONITORAMENTO],
  );

  assert.equal(isFixedPage(FIXED_PAGE_MONITORAMENTO), true);
  assert.equal(isFixedPage("page-analise"), false);
  assert.equal(isFixedPage("page-visao-geral"), false);
});

test("normalizeBoard substitui a fixa gravada por engano pelo arranjo oficial", () => {
  const board = normalizeBoard({
    pages: [
      {
        id: FIXED_PAGE_MONITORAMENTO,
        name: "Minha fixa",
        widgets: [{ id: "map", type: "map", x: 0, y: 0, w: 4, h: 3 }],
      },
      userPage(),
    ],
    activePageId: "page-visao-geral",
  });

  assert.equal(board.pages.length, 2);
  assert.equal(board.pages[0].name, "Monitoramento");
  assert.equal(board.pages[0].widgets.length, 4);
  assert.equal(board.pages[1].name, "Visão geral");
});

test("normalizeBoard descarta a página que deixou de ser fixa, com o conteúdo dela", () => {
  const board = normalizeBoard({
    pages: [
      {
        id: "page-analise",
        name: "Análise",
        widgets: defaultWidgets(),
      },
      userPage(),
    ],
    activePageId: "page-analise",
  });

  assert.deepEqual(
    board.pages.map((page) => page.id),
    [FIXED_PAGE_MONITORAMENTO, "page-visao-geral"],
  );

  // a ativa descartada cai na fixa
  assert.equal(board.activePageId, FIXED_PAGE_MONITORAMENTO);
});

test("newPage numera sem repetir nome e cria página vazia", () => {
  const pages = [fixedPages()[0], userPage("Página 2")];

  const created = newPage(pages);

  assert.equal(created.name, "Página 3");
  assert.equal(created.widgets.length, 0);
  assert.equal(created.id.startsWith("page-"), true);
  assert.equal(isFixedPage(created.id), false);

  const again = newPage([...pages, created]);

  assert.equal(again.name, "Página 4");
  assert.notEqual(again.id, created.id);
});

test("o painel padrão é a fixa, já ativa", () => {
  const board = defaultBoard();

  assert.equal(board.pages.length, 1);
  assert.equal(board.activePageId, FIXED_PAGE_MONITORAMENTO);
});

test("saveBoard e loadBoard preservam a fixa e a página do usuário", () => {
  const restore = useStorage();

  try {
    const board: Board = {
      pages: [fixedPages()[0], userPage()],
      activePageId: "page-visao-geral",
    };

    saveBoard(board);
    const loaded = loadBoard();

    assert.deepEqual(
      loaded.pages.map((page) => page.id),
      [FIXED_PAGE_MONITORAMENTO, "page-visao-geral"],
    );

    assert.equal(loaded.activePageId, "page-visao-geral");
    assert.equal(loaded.pages[0].widgets.length, 4);
    assert.deepEqual(
      loaded.pages[1].widgets.map((widget) => widget.type),
      ["map", "summary"],
    );
  } finally {
    restore();
  }
});

test("loadBoard cai no painel padrão com storage vazio, lixo ou sem páginas", () => {
  const cases = [
    {},
    { [BOARD_STORAGE_KEY]: "isso não é json" },
    { [BOARD_STORAGE_KEY]: JSON.stringify({ activePageId: "x" }) },
    { [BOARD_STORAGE_KEY]: "null" },
  ];

  for (const initial of cases) {
    const restore = useStorage(initial);

    try {
      assert.deepEqual(loadBoard(), defaultBoard());
    } finally {
      restore();
    }
  }
});

test("loadBoard descarta a retired que veio do storage", () => {
  const restore = useStorage({
    [BOARD_STORAGE_KEY]: JSON.stringify({
      pages: [
        { id: "page-analise", name: "Análise", widgets: defaultWidgets() },
        userPage(),
      ],
      activePageId: "page-visao-geral",
    }),
  });

  try {
    const board = loadBoard();

    assert.deepEqual(
      board.pages.map((page) => page.id),
      [FIXED_PAGE_MONITORAMENTO, "page-visao-geral"],
    );
  } finally {
    restore();
  }
});

test("storage indisponível não derruba o painel", () => {
  const restore = useStorage({}, true);

  try {
    assert.doesNotThrow(() => saveBoard(defaultBoard()));
    assert.deepEqual(loadBoard(), defaultBoard());
  } finally {
    restore();
  }
});

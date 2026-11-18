/*
 * Painel do monitoramento (TEC34/TEC37).
 *
 * A tela é uma grade de células quadradas: 12 colunas em uma
 * janela larga e 6 ou 3 quando ela fica estreita. Cada bloco
 * ocupa um retângulo (x, y, w, h) medido em células. As regras
 * abaixo são puras: mantêm o arranjo alinhado, sem sobreposição,
 * e fecham os buracos que sobrarem acima dos blocos.
 */

export const GRID_COLS = 12;
export const GRID_GAP = 12;
/** Menor célula confortável antes de a grade cair para menos colunas. */
export const MIN_CELL_PX = 56;
/** Linhas vazias mostradas durante a edição, como área de descarte. */
export const EDIT_SPARE_ROWS = 2;

export type MonitoringWidgetType =
  | "map"
  | "region"
  | "services"
  | "summary"
  | "ranking"
  | "history"
  | "comparison"
  | "projection";

export type MonitoringWidgetKind = "visualizacao" | "indicador";

export type MonitoringWidgetSpec = {
  type: MonitoringWidgetType;
  kind: MonitoringWidgetKind;
  label: string;
  /** Tamanho de um bloco novo, e o menor tamanho que ele aceita, em células. */
  w: number;
  h: number;
  minW: number;
  minH: number;
};

export const MONITORING_WIDGETS: readonly MonitoringWidgetSpec[] = [
  {
    type: "map",
    kind: "visualizacao",
    label: "Mapa de serviços",
    w: 8,
    h: 5,
    minW: 4,
    minH: 3,
  },
  {
    type: "region",
    kind: "visualizacao",
    label: "Energia por região",
    w: 4,
    h: 5,
    minW: 3,
    minH: 3,
  },
  {
    type: "services",
    kind: "indicador",
    label: "Serviços monitorados",
    w: 12,
    h: 2,
    minW: 4,
    minH: 2,
  },
  {
    type: "summary",
    kind: "indicador",
    label: "Resumo ambiental",
    w: 4,
    h: 3,
    minW: 3,
    minH: 2,
  },
  {
    type: "ranking",
    kind: "indicador",
    label: "Ranking de impacto",
    w: 4,
    h: 6,
    minW: 3,
    minH: 4,
  },
  {
    type: "history",
    kind: "visualizacao",
    label: "Histórico do serviço",
    w: 6,
    h: 5,
    minW: 4,
    minH: 3,
  },
  {
    type: "comparison",
    kind: "visualizacao",
    label: "Comparação de serviços",
    w: 6,
    h: 5,
    minW: 4,
    minH: 3,
  },
  {
    type: "projection",
    kind: "visualizacao",
    label: "Projeção de localização",
    w: 6,
    h: 5,
    minW: 4,
    minH: 3,
  },
];

const SPECS = new Map(
  MONITORING_WIDGETS.map((spec) => [spec.type, spec]),
);

export const widgetSpec = (type: MonitoringWidgetType) => SPECS.get(type)!;

export const isMonitoringWidgetType = (
  value: unknown,
): value is MonitoringWidgetType =>
  typeof value === "string" &&
  SPECS.has(value as MonitoringWidgetType);

export type Rect = { x: number; y: number; w: number; h: number };

export type BoardWidget = Rect & {
  id: string;
  type: MonitoringWidgetType;
  /** Minimizado: fica só a barra, com uma linha de altura. */
  collapsed?: boolean;
  /** Altura que o bloco tinha antes de ser minimizado. */
  expandedH?: number;
};

/** Colunas a que uma janela estreita recorre (tela dividida, celular). */
export type NarrowCols = 6 | 3;
export type Cols = typeof GRID_COLS | NarrowCols;

/*
 * `widgets` é sempre o arranjo de 12 colunas. `layouts` guarda
 * os arranjos feitos nas larguras menores: uma largura sem
 * arranjo próprio mostra o de 12 colunas refluído.
 */
export type BoardPage = {
  id: string;
  name: string;
  widgets: BoardWidget[];
  layouts?: Partial<Record<NarrowCols, BoardWidget[]>>;
};

export type Board = { pages: BoardPage[]; activePageId: string };

let idCounter = 0;

const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`;

export const newWidgetId = (type: MonitoringWidgetType) =>
  nextId(type);

export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w &&
  b.x < a.x + a.w &&
  a.y < b.y + b.h &&
  b.y < a.y + a.h;

export const bottom = (widgets: readonly Rect[]) =>
  widgets.reduce(
    (max, widget) => Math.max(max, widget.y + widget.h),
    0,
  );

/** Mantém o retângulo dentro das colunas e abaixo do topo, no tamanho mínimo. */
export function fitRect(
  rect: Rect,
  type: MonitoringWidgetType,
  cols: number = GRID_COLS,
): Rect {
  const spec = widgetSpec(type);
  const minW = Math.min(spec.minW, cols);
  const w = Math.max(minW, Math.min(cols, Math.round(rect.w)));
  const h = Math.max(spec.minH, Math.round(rect.h));

  return {
    x: Math.max(0, Math.min(cols - w, Math.round(rect.x))),
    y: Math.max(0, Math.round(rect.y)),
    w,
    h,
  };
}

/**
 * Acomoda o arranjo em torno de `fixedId` (o bloco que está sendo
 * movido, redimensionado ou adicionado): ele fica onde está, os
 * que ele encontra descem, e os demais sobem o máximo que podem
 * sem atravessar outro bloco.
 */
export function resolveLayout(
  widgets: readonly BoardWidget[],
  fixedId?: string,
): BoardWidget[] {
  const fixed = widgets.find((widget) => widget.id === fixedId);
  const placed: BoardWidget[] = fixed ? [{ ...fixed }] : [];
  const others = widgets
    .filter((widget) => widget !== fixed)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  for (const widget of others) {
    const at = { ...widget };

    while (placed.some((other) => overlaps(at, other))) {
      at.y += 1;
    }

    while (
      at.y > 0 &&
      !placed.some((other) =>
        overlaps({ ...at, y: at.y - 1 }, other),
      )
    ) {
      at.y -= 1;
    }

    placed.push(at);
  }

  // Mesma ordem recebida, para o React preservar cada elemento.
  const byId = new Map(
    placed.map((widget) => [widget.id, widget]),
  );

  return widgets.map((widget) => byId.get(widget.id)!);
}

/**
 * Coloca `widget` no retângulo informado: os blocos que ele
 * encontra abrem espaço abaixo, e a página inteira sobe para
 * fechar os buracos — inclusive o bloco movido.
 */
export function placeWidget(
  widgets: readonly BoardWidget[],
  widget: BoardWidget,
): BoardWidget[] {
  const exists = widgets.some((item) => item.id === widget.id);

  const list = exists
    ? widgets.map((item) =>
        item.id === widget.id ? widget : item,
      )
    : [...widgets, widget];

  return resolveLayout(
    resolveLayout(list, widget.id),
  );
}

/** Primeiro lugar livre para um bloco, descendo linha a linha. */
export function freeSpot(
  widgets: readonly Rect[],
  w: number,
  h: number,
  cols: number = GRID_COLS,
  fromY = 0,
): { x: number; y: number } {
  const width = Math.min(w, cols);

  for (let y = fromY; ; y++) {
    for (let x = 0; x + width <= cols; x++) {
      const overlapsAny = widgets.some((other) =>
        overlaps({ x, y, w: width, h }, other),
      );

      if (!overlapsAny) return { x, y };
    }
  }
}

/** Quantas colunas uma grade de `widthPx` mostra: 12, 6 ou 3. */
export function columnsFor(
  widthPx: number,
  gapPx: number = GRID_GAP,
): Cols {
  for (const cols of [GRID_COLS, 6] as const) {
    const cell = (widthPx - gapPx * (cols - 1)) / cols;

    if (cell >= MIN_CELL_PX) return cols;
  }

  return 3;
}

/** Tamanho do bloco em uma grade mais estreita: nunca mais largo que ela. */
function sizeFor(widget: BoardWidget, cols: number) {
  return {
    w: Math.min(widget.w, cols),
    h: widget.h,
  };
}

/**
 * O arranjo de 12 colunas derramado em menos colunas, na ordem
 * de leitura: cada bloco mantém o tamanho em células (no limite
 * da largura) e ocupa o primeiro lugar livre a partir da linha
 * anterior. Em vez de espremer, a página cresce para baixo.
 */
export function reflow(
  widgets: readonly BoardWidget[],
  cols: number,
): BoardWidget[] {
  if (cols >= GRID_COLS) return [...widgets];

  const placed: BoardWidget[] = [];
  let fromY = 0;

  for (const widget of [...widgets].sort(
    (a, b) => a.y - b.y || a.x - b.x,
  )) {
    const size = sizeFor(widget, cols);
    const spot = freeSpot(
      placed,
      size.w,
      size.h,
      cols,
      fromY,
    );

    fromY = spot.y;

    placed.push({ ...widget, ...size, ...spot });
  }

  const byId = new Map(
    placed.map((widget) => [widget.id, widget]),
  );

  return widgets.map((widget) => byId.get(widget.id)!);
}

/** O arranjo que a página mostra em uma grade de `cols` colunas. */
export function layoutFor(
  page: BoardPage,
  cols: Cols,
): BoardWidget[] {
  if (cols === GRID_COLS) return page.widgets;

  const own = page.layouts?.[cols];

  if (!own) return reflow(page.widgets, cols);

  const types = new Map(
    page.widgets.map((widget) => [widget.id, widget.type]),
  );

  const kept = own
    .filter((widget) => types.has(widget.id))
    .map((widget) => ({
      ...widget,
      type: types.get(widget.id)!,
    }));

  const keptIds = new Set(kept.map((widget) => widget.id));

  let result = kept;

  // Blocos criados em outra largura entram embaixo, com o tamanho daqui.
  for (const widget of page.widgets.filter(
    (item) => !keptIds.has(item.id),
  )) {
    const size = sizeFor(widget, cols);

    result = [
      ...result,
      {
        ...widget,
        ...size,
        ...freeSpot(
          result,
          size.w,
          size.h,
          cols,
          bottom(result),
        ),
      },
    ];
  }

  return resolveLayout(result);
}

/**
 * `page` depois de a grade de `cols` colunas receber `next`.
 *
 * Mudanças de posição e tamanho ficam no arranjo daquela largura;
 * um bloco adicionado nela também entra nos outros arranjos e um
 * bloco removido sai de todos.
 */
export function applyLayout(
  page: BoardPage,
  cols: Cols,
  next: BoardWidget[],
): BoardPage {
  const before = layoutFor(page, cols);
  const nextIds = new Set(next.map((widget) => widget.id));

  const removed = new Set(
    before
      .filter((widget) => !nextIds.has(widget.id))
      .map((widget) => widget.id),
  );

  const beforeIds = new Set(before.map((widget) => widget.id));

  const added = next.filter(
    (widget) => !beforeIds.has(widget.id),
  );

  const keep = (list: readonly BoardWidget[]) =>
    list.filter((widget) => !removed.has(widget.id));

  let widgets: BoardWidget[];

  if (cols === GRID_COLS) {
    widgets = next;
  } else {
    widgets = keep(page.widgets);

    for (const widget of added) {
      const spec = widgetSpec(widget.type);

      const spot = freeSpot(
        widgets,
        spec.w,
        spec.h,
        GRID_COLS,
      );

      widgets = placeWidget(widgets, {
        id: widget.id,
        type: widget.type,
        ...fitRect(
          { ...spot, w: spec.w, h: spec.h },
          widget.type,
          GRID_COLS,
        ),
      });
    }
  }

  const layouts: Partial<Record<NarrowCols, BoardWidget[]>> = {};

  for (const narrow of [6, 3] as const) {
    // Só as larguras que o usuário organizou guardam arranjo próprio.
    if (narrow === cols) {
      layouts[narrow] = next;
    } else if (page.layouts?.[narrow]) {
      layouts[narrow] = keep(page.layouts[narrow]!);
    }
  }

  const { layouts: _previous, ...rest } = page;

  return Object.keys(layouts).length > 0
    ? { ...rest, widgets, layouts }
    : { ...rest, widgets };
}

/** Adiciona um bloco (no ponto pedido ou no primeiro lugar livre). */
export function addWidget(
  widgets: readonly BoardWidget[],
  type: MonitoringWidgetType,
  at?: { x: number; y: number },
  cols: number = GRID_COLS,
  id: string = newWidgetId(type),
): BoardWidget[] {
  const spec = widgetSpec(type);

  const spot =
    at ?? freeSpot(widgets, Math.min(spec.w, cols), spec.h, cols);

  const widget: BoardWidget = {
    id,
    type,
    ...fitRect(
      { ...spot, w: spec.w, h: spec.h },
      type,
      cols,
    ),
  };

  return placeWidget(widgets, widget);
}

/** Bordas de redimensionamento: lados e cantos. */
export type ResizeDir =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

export const RESIZE_DIRECTIONS: readonly ResizeDir[] = [
  "n",
  "s",
  "e",
  "w",
  "ne",
  "nw",
  "se",
  "sw",
];

/**
 * O retângulo depois de arrastar `dir` por (dCols, dRows) células.
 * As bordas opostas ficam paradas e o bloco não passa dos limites.
 */
export function resizeRect(
  start: Rect,
  dir: ResizeDir,
  dCols: number,
  dRows: number,
  type: MonitoringWidgetType,
  cols: number = GRID_COLS,
): Rect {
  const spec = widgetSpec(type);
  const minW = Math.min(spec.minW, cols);
  const east = dir.includes("e");
  const west = dir.includes("w");
  const south = dir.includes("s");
  const north = dir.includes("n");

  const right = start.x + start.w;
  const lower = start.y + start.h;

  let w = start.w + (east ? dCols : west ? -dCols : 0);
  let h = start.h + (south ? dRows : north ? -dRows : 0);

  // O espaço disponível no lado que se move.
  const maxW = east ? cols - start.x : west ? right : cols;
  const maxH = north ? lower : Infinity;

  w = Math.max(minW, Math.min(maxW, Math.round(w)));
  h = Math.max(spec.minH, Math.min(maxH, Math.round(h)));

  return {
    x: west ? right - w : start.x,
    y: north ? lower - h : start.y,
    w,
    h,
  };
}

/** Minimiza o bloco em uma linha, guardando a altura para restaurar. */
export function collapseWidget(
  widgets: readonly BoardWidget[],
  id: string,
): BoardWidget[] {
  const widget = widgets.find((item) => item.id === id);

  if (!widget) return [...widgets];

  if (widget.collapsed) {
    const spec = widgetSpec(widget.type);

    return placeWidget(widgets, {
      ...widget,
      collapsed: undefined,
      expandedH: undefined,
      h: Math.max(spec.minH, widget.expandedH ?? spec.h),
    });
  }

  return placeWidget(widgets, {
    ...widget,
    collapsed: true,
    expandedH: widget.h,
    h: 1,
  });
}

// ---------- páginas e persistência ----------

const DEFAULT_WIDGETS: readonly BoardWidget[] = [
  { id: "map", type: "map", x: 0, y: 0, w: 8, h: 5 },
  { id: "region", type: "region", x: 8, y: 0, w: 4, h: 5 },
  { id: "services", type: "services", x: 0, y: 5, w: 12, h: 2 },
];

export function defaultWidgets(): BoardWidget[] {
  return DEFAULT_WIDGETS.map((widget) => ({ ...widget }));
}

export function defaultBoard(): Board {
  const page: BoardPage = {
    id: "page-visao-geral",
    name: "Visão geral",
    widgets: defaultWidgets(),
  };

  return { pages: [page], activePageId: page.id };
}

export function newPage(
  pages: readonly BoardPage[],
): BoardPage {
  const names = new Set(pages.map((page) => page.name));

  let n = pages.length + 1;

  while (names.has(`Página ${n}`)) n += 1;

  return {
    id: nextId("page"),
    name: `Página ${n}`,
    widgets: [],
  };
}

const layoutSignature = (
  widgets: readonly BoardWidget[],
) =>
  widgets
    .map(
      (widget) =>
        `${widget.type}:${widget.x}:${widget.y}:${widget.w}:${widget.h}:${widget.collapsed ? "c" : ""}`,
    )
    .sort()
    .join("|");

/** A página ainda está no arranjo padrão? */
export const isDefaultLayout = (
  widgets: readonly BoardWidget[],
) =>
  layoutSignature(widgets) ===
  layoutSignature(DEFAULT_WIDGETS);

export const BOARD_STORAGE_KEY =
  "greener.monitoring.board.v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCell = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function parseWidget(
  value: unknown,
  cols: Cols,
): BoardWidget | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isMonitoringWidgetType(value.type) ||
    ![value.x, value.y, value.w, value.h].every(isCell)
  ) {
    return null;
  }

  const spec = widgetSpec(value.type);

  const rect = fitRect(
    value as unknown as Rect,
    value.type,
    cols,
  );

  if (value.collapsed === true) {
    const expandedH = isCell(value.expandedH)
      ? Math.max(spec.minH, Math.round(value.expandedH))
      : spec.h;

    return {
      id: value.id,
      type: value.type,
      ...rect,
      h: 1,
      collapsed: true,
      expandedH,
    };
  }

  return { id: value.id, type: value.type, ...rect };
}

/**
 * Lê um painel salvo. Qualquer coisa ilegível é descartada,
 * nunca lançada — o usuário sempre cai em um painel válido.
 */
export function parseBoard(raw: string | null): Board | null {
  if (!raw) return null;

  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(data) || !Array.isArray(data.pages)) {
    return null;
  }

  const pages: BoardPage[] = [];

  for (const page of data.pages) {
    if (
      !isRecord(page) ||
      typeof page.id !== "string" ||
      typeof page.name !== "string" ||
      !Array.isArray(page.widgets)
    ) {
      continue;
    }

    const widgets: BoardWidget[] = [];

    for (const widget of page.widgets) {
      const parsed = parseWidget(widget, GRID_COLS);

      if (parsed) widgets.push(parsed);
    }

    // Arranjo salvo é confiável só depois de assentado.
    const parsedPage: BoardPage = {
      id: page.id,
      name: page.name.trim() || "Página",
      widgets: resolveLayout(widgets),
    };

    if (isRecord(page.layouts)) {
      const layouts: Partial<
        Record<NarrowCols, BoardWidget[]>
      > = {};

      for (const cols of [6, 3] as const) {
        const list = page.layouts[String(cols)];

        if (!Array.isArray(list)) continue;

        const items: BoardWidget[] = [];

        for (const widget of list) {
          const parsed = parseWidget(widget, cols);

          if (parsed) items.push(parsed);
        }

        layouts[cols] = resolveLayout(items);
      }

      if (Object.keys(layouts).length > 0) {
        parsedPage.layouts = layouts;
      }
    }

    pages.push(parsedPage);
  }

  if (pages.length === 0) return null;

  const activePageId =
    typeof data.activePageId === "string" &&
    pages.some((page) => page.id === data.activePageId)
      ? data.activePageId
      : pages[0].id;

  return { pages, activePageId };
}

export function loadBoard(): Board {
  try {
    return (
      parseBoard(localStorage.getItem(BOARD_STORAGE_KEY)) ??
      defaultBoard()
    );
  } catch {
    return defaultBoard();
  }
}

export function saveBoard(board: Board) {
  try {
    localStorage.setItem(
      BOARD_STORAGE_KEY,
      JSON.stringify(board),
    );
  } catch {
    // Sem armazenamento disponível: o painel vale para esta sessão.
  }
}

/*
 * Regras puras do layout adaptável (TEC34).
 *
 * O grid tem 12 colunas e cada widget declara um tamanho
 * preferido. A reorganização é controlada: o usuário muda
 * apenas a ORDEM e o estado minimizado — nunca posição livre
 * ou tamanho arbitrário. O empacotamento abaixo garante que
 * nenhuma linha fique com buracos, qualquer que seja a ordem.
 */

export const GRID_COLUMNS = 12;

export type WidgetSize = "primary" | "secondary" | "full";

const PREFERRED_SPAN: Record<WidgetSize, number> = {
  primary: 8,
  secondary: 4,
  full: GRID_COLUMNS,
};

export type WidgetPlacement<Id extends string> = {
  id: Id;
  span: number;
  row: number;
  collapsed: boolean;
};

/** Move `id` para `targetIndex`, deslocando os demais. */
export function moveWidget<Id>(
  order: readonly Id[],
  id: Id,
  targetIndex: number,
): Id[] {
  const currentIndex = order.indexOf(id);

  if (currentIndex < 0) {
    return [...order];
  }

  const clampedTarget = Math.max(0, Math.min(order.length - 1, targetIndex));

  if (clampedTarget === currentIndex) {
    return [...order];
  }

  const next = order.filter((item) => item !== id);

  next.splice(clampedTarget, 0, id);

  return next;
}

/** Move `id` uma ou mais posições para antes (negativo) ou depois. */
export function moveWidgetBy<Id>(
  order: readonly Id[],
  id: Id,
  delta: number,
): Id[] {
  const currentIndex = order.indexOf(id);

  if (currentIndex < 0) {
    return [...order];
  }

  return moveWidget(order, id, currentIndex + delta);
}

/**
 * Calcula quantas colunas cada widget ocupa.
 *
 * - Widgets minimizados viram uma barra de linha inteira.
 * - Widgets expandidos entram na linha atual se couberem.
 * - Se sobrar espaço numa linha, o widget de maior tamanho
 *   preferido cresce para preenchê-la (sem buracos no grid).
 */
export function computeWidgetPlacements<Id extends string>(
  order: readonly Id[],
  sizes: Readonly<Record<Id, WidgetSize>>,
  collapsed: ReadonlySet<Id>,
): WidgetPlacement<Id>[] {
  const placements: WidgetPlacement<Id>[] = [];

  let row: WidgetPlacement<Id>[] = [];
  let used = 0;
  let rowIndex = 0;

  function flushRow() {
    if (row.length === 0) {
      return;
    }

    const leftover = GRID_COLUMNS - used;

    if (leftover > 0) {
      const grower = row.reduce((largest, item) =>
        item.span > largest.span ? item : largest,
      );

      grower.span += leftover;
    }

    placements.push(...row);

    row = [];
    used = 0;
    rowIndex += 1;
  }

  for (const id of order) {
    const isCollapsed = collapsed.has(id);

    const span = isCollapsed ? GRID_COLUMNS : PREFERRED_SPAN[sizes[id]];

    if (used + span > GRID_COLUMNS) {
      flushRow();
    }

    row.push({ id, span, row: rowIndex, collapsed: isCollapsed });

    used += span;
  }

  flushRow();

  return placements;
}

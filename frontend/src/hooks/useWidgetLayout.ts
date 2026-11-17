import { useCallback, useMemo, useState } from "react";

import {
  computeWidgetPlacements,
  moveWidget,
  moveWidgetBy,
  type WidgetPlacement,
  type WidgetSize,
} from "../lib/dashboardLayout";

export type WidgetLayoutDefinition<Id extends string> = {
  id: Id;
  title: string;
  size: WidgetSize;
};

export type WidgetLayout<Id extends string> = {
  order: Id[];
  placements: WidgetPlacement<Id>[];
  isEditing: boolean;
  isCustomized: boolean;
  announcement: string;
  setEditing: (editing: boolean) => void;
  moveTo: (id: Id, targetIndex: number) => void;
  moveBy: (id: Id, delta: number) => void;
  toggleCollapsed: (id: Id) => void;
  reset: () => void;
};

/*
 * Estado do layout adaptável. Fica apenas em memória:
 * a persistência da personalização está fora do escopo
 * desta entrega (recarregar a página volta ao padrão).
 */
export function useWidgetLayout<Id extends string>(
  definitions: readonly WidgetLayoutDefinition<Id>[],
): WidgetLayout<Id> {
  const defaultOrder = useMemo(
    () => definitions.map((definition) => definition.id),
    [definitions],
  );

  const sizes = useMemo(
    () =>
      Object.fromEntries(
        definitions.map((definition) => [definition.id, definition.size]),
      ) as Record<Id, WidgetSize>,
    [definitions],
  );

  const titles = useMemo(
    () =>
      new Map(
        definitions.map((definition) => [definition.id, definition.title]),
      ),
    [definitions],
  );

  const [order, setOrder] = useState<Id[]>(defaultOrder);
  const [collapsed, setCollapsed] = useState<ReadonlySet<Id>>(new Set());
  const [isEditing, setEditing] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const applyOrder = useCallback(
    (id: Id, next: Id[]) => {
      setOrder(next);
      setAnnouncement(
        `${titles.get(id)} movido para a posição ${
          next.indexOf(id) + 1
        } de ${next.length}.`,
      );
    },
    [titles],
  );

  const moveTo = useCallback(
    (id: Id, targetIndex: number) =>
      applyOrder(id, moveWidget(order, id, targetIndex)),
    [applyOrder, order],
  );

  const moveBy = useCallback(
    (id: Id, delta: number) => applyOrder(id, moveWidgetBy(order, id, delta)),
    [applyOrder, order],
  );

  const toggleCollapsed = useCallback(
    (id: Id) => {
      const willCollapse = !collapsed.has(id);
      const next = new Set(collapsed);

      if (willCollapse) {
        next.add(id);
      } else {
        next.delete(id);
      }

      setCollapsed(next);
      setAnnouncement(
        `${titles.get(id)} ${willCollapse ? "minimizado" : "expandido"}.`,
      );
    },
    [collapsed, titles],
  );

  const reset = useCallback(() => {
    setOrder(defaultOrder);
    setCollapsed(new Set());
    setAnnouncement("Layout padrão restaurado.");
  }, [defaultOrder]);

  const placements = useMemo(
    () => computeWidgetPlacements(order, sizes, collapsed),
    [order, sizes, collapsed],
  );

  const isCustomized =
    collapsed.size > 0 ||
    order.some((id, index) => id !== defaultOrder[index]);

  return {
    order,
    placements,
    isEditing,
    isCustomized,
    announcement,
    setEditing,
    moveTo,
    moveBy,
    toggleCollapsed,
    reset,
  };
}

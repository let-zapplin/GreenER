import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GRID_COLS,
  addWidget,
  applyLayout,
  collapseWidget,
  defaultWidgets,
  isDefaultLayout,
  isFixedPage,
  layoutFor,
  loadBoard,
  newPage,
  resolveLayout,
  saveBoard,
  type Board,
  type BoardPage,
  type BoardWidget,
  type Cols,
  type MonitoringWidgetType,
} from "../lib/monitoringBoard";

/*
 * Estado do painel do monitoramento: páginas, arranjo da largura
 * atual, modo de edição e persistência local. As regras de grade
 * ficam em lib/monitoringBoard.ts.
 */
export function useMonitoringBoard() {
  const [board, setBoard] = useState<Board>(loadBoard);
  const [editing, setEditing] = useState(false);
  const [cols, setCols] = useState<Cols>(GRID_COLS);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => saveBoard(board), [board]);

  const activePage =
    board.pages.find(
      (page) => page.id === board.activePageId,
    ) ?? board.pages[0];

  const locked = isFixedPage(activePage.id);

  // Página fixa não entra (nem permanece) em modo de edição.
  useEffect(() => {
    if (locked) setEditing(false);
  }, [locked]);

  const widgets = useMemo(
    () => layoutFor(activePage, cols),
    [activePage, cols],
  );

  const isCustomized = useMemo(() => {
    const hasNarrowLayout =
      Object.keys(activePage.layouts ?? {}).length > 0;

    return (
      hasNarrowLayout || !isDefaultLayout(activePage.widgets)
    );
  }, [activePage]);

  const changeWidgets = useCallback(
    (next: BoardWidget[]) => {
      if (locked) return;

      setBoard((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === current.activePageId
            ? applyLayout(page, cols, next)
            : page,
        ),
      }));
    },
    [cols, locked],
  );

  const selectPage = useCallback(
    (id: string) => {
      const page = board.pages.find((item) => item.id === id);

      if (!page) return;

      setBoard((current) => ({ ...current, activePageId: id }));
      setAnnouncement(`${page.name} selecionada.`);
    },
    [board.pages],
  );

  const addPage = useCallback(() => {
    const page = newPage(board.pages);

    setBoard((current) => ({
      pages: [...current.pages, page],
      activePageId: page.id,
    }));

    setAnnouncement(
      `${page.name} criada. Arraste blocos da paleta para montá-la.`,
    );

    // A página nova nasce vazia: abre a paleta para preenchê-la.
    setEditing(true);
  }, [board.pages]);

  const renamePage = useCallback((id: string, name: string) => {
    const trimmed = name.trim();

    if (!trimmed || isFixedPage(id)) return;

    setBoard((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === id ? { ...page, name: trimmed } : page,
      ),
    }));

    setAnnouncement(`Página renomeada para ${trimmed}.`);
  }, []);

  const deletePage = useCallback(() => {
    if (isFixedPage(board.activePageId)) return;

    const index = board.pages.findIndex(
      (page) => page.id === board.activePageId,
    );

    const pages = board.pages.filter(
      (page) => page.id !== board.activePageId,
    );

    const fallback = pages[Math.max(0, index - 1)] ?? pages[0];

    setBoard({
      pages,
      activePageId: fallback.id,
    });

    setAnnouncement("Página excluída.");
  }, [board.pages, board.activePageId]);

  const resetPage = useCallback(() => {
    if (isFixedPage(board.activePageId)) return;

    setBoard((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === current.activePageId
          ? {
              id: page.id,
              name: page.name,
              widgets: defaultWidgets(),
            }
          : page,
      ),
    }));

    setAnnouncement(
      "Arranjo padrão restaurado nesta página.",
    );
  }, [board.activePageId]);

  const toggleCollapsed = useCallback(
    (id: string) => {
      changeWidgets(
        collapseWidget(layoutFor(activePage, cols), id),
      );
    },
    [activePage, cols, changeWidgets],
  );

  const removeBlock = useCallback(
    (id: string) => {
      changeWidgets(
        resolveLayout(
          layoutFor(activePage, cols).filter(
            (widget) => widget.id !== id,
          ),
        ),
      );
    },
    [activePage, cols, changeWidgets],
  );

  const addBlock = useCallback(
    (type: MonitoringWidgetType) => {
      changeWidgets(addWidget(widgets, type, undefined, cols));
    },
    [widgets, cols, changeWidgets],
  );

  return {
    pages: board.pages,
    activePage: activePage as BoardPage,
    widgets,
    cols,
    editing,
    locked,
    isCustomized,
    announcement,
    setEditing,
    setColumns: setCols,
    changeWidgets,
    selectPage,
    addPage,
    renamePage,
    deletePage,
    resetPage,
    toggleCollapsed,
    removeBlock,
    addBlock,
  };
}

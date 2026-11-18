import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowsLeftRightIcon,
  ArrowCounterClockwiseIcon,
  ChartBarIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  DotsSixVerticalIcon,
  GaugeIcon,
  GlobeHemisphereWestIcon,
  GridFourIcon,
  ListDashesIcon,
  LockSimpleIcon,
  MapTrifoldIcon,
  MinusIcon,
  PencilSimpleIcon,
  PlusIcon,
  RankingIcon,
  SlidersHorizontalIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";

import {
  EDIT_SPARE_ROWS,
  GRID_COLS,
  GRID_GAP,
  MONITORING_WIDGETS,
  RESIZE_DIRECTIONS,
  addWidget,
  bottom,
  columnsFor,
  fitRect,
  isFixedPage,
  newWidgetId,
  placeWidget,
  resizeRect,
  widgetSpec,
  type BoardWidget,
  type MonitoringWidgetType,
  type Rect,
  type ResizeDir,
} from "../lib/monitoringBoard";
import type { useMonitoringBoard } from "../hooks/useMonitoringBoard";

import "./MonitoringBoard.css";

/** Deslocamento do ponteiro antes de um clique virar arraste. */
const DRAG_START_PX = 5;
/** Distância da borda da janela em que o arraste rola a página. */
const AUTO_SCROLL_EDGE_PX = 56;
const AUTO_SCROLL_STEP_PX = 16;
/** Abaixo desta largura a paleta flutua sobre a grade. */
const PALETTE_OVERLAY_PX = 760;
/** Segundo clique nesta janela confirma uma ação destrutiva. */
const CONFIRM_MS = 3000;

const WIDGET_ICONS: Record<MonitoringWidgetType, ReactNode> = {
  map: <MapTrifoldIcon aria-hidden="true" weight="bold" />,
  region: <ChartBarIcon aria-hidden="true" weight="bold" />,
  services: <ListDashesIcon aria-hidden="true" weight="bold" />,
  summary: <GaugeIcon aria-hidden="true" weight="bold" />,
  ranking: <RankingIcon aria-hidden="true" weight="bold" />,
  history: (
    <ClockCounterClockwiseIcon aria-hidden="true" weight="bold" />
  ),
  comparison: (
    <ArrowsLeftRightIcon aria-hidden="true" weight="bold" />
  ),
  projection: (
    <GlobeHemisphereWestIcon aria-hidden="true" weight="bold" />
  ),
};

const PALETTE_GROUPS = [
  { kind: "visualizacao", title: "Visualizações" },
  { kind: "indicador", title: "Indicadores" },
] as const;

type Drag = {
  mode: "move" | "resize" | "add";
  id: string;
  type: MonitoringWidgetType;
  dir?: ResizeDir;
  /** Retângulo do bloco quando o arraste começou. */
  start: Rect;
  startX: number;
  startY: number;
  /** Deslocamento do ponteiro dentro do bloco. */
  grabX: number;
  grabY: number;
  moved: boolean;
  /** Destino encaixado na grade; nulo quando um bloco novo está fora dela. */
  rect: Rect | null;
  clientX: number;
  clientY: number;
};

type MonitoringBoardProps = {
  state: ReturnType<typeof useMonitoringBoard>;
  contents: Record<MonitoringWidgetType, ReactNode>;
  toolbarExtra?: ReactNode;
};

/**
 * Painel do monitoramento: abas de páginas, ações e uma grade de
 * células quadradas. Em edição, os blocos são arrastados pela barra,
 * redimensionados pelas bordas e adicionados ou removidos pela paleta.
 */
export function MonitoringBoard({
  state,
  contents,
  toolbarExtra,
}: MonitoringBoardProps) {
  const {
    pages,
    activePage,
    widgets,
    cols,
    editing,
    locked,
    isCustomized,
    announcement,
    setEditing,
    setColumns,
    changeWidgets,
    selectPage,
    addPage,
    renamePage,
    deletePage,
    resetPage,
    toggleCollapsed,
    removeBlock,
    addBlock,
  } = state;

  const boardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const [gridWidth, setGridWidth] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;

  const cell = Math.max(
    0,
    (gridWidth - GRID_GAP * (cols - 1)) / cols,
  );
  const pitch = cell + GRID_GAP;

  const updateDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // A largura da grade define as colunas; a do painel, se a paleta flutua.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const board = boardRef.current;

    if (!grid || !board) return;

    const measure = () => {
      setGridWidth(grid.clientWidth);
      setNarrow(board.clientWidth < PALETTE_OVERLAY_PX);
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(grid);
    observer.observe(board);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (gridWidth > 0) {
      setColumns(columnsFor(gridWidth, GRID_GAP));
    }
  }, [gridWidth, setColumns]);

  // Ao entrar em edição a paleta aparece.
  useEffect(() => {
    if (editing) setPaletteOpen(true);
  }, [editing]);

  // Sair da edição solta o que estava sendo arrastado.
  useEffect(() => {
    if (!editing) {
      dragRef.current = null;
      setDrag(null);
      setConfirmDelete(false);
      setConfirmReset(false);
    }
  }, [editing]);

  // Esc sai da edição (um arraste em curso consome o primeiro Esc).
  useEffect(() => {
    if (!editing) return;

    const leave = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !(event.target instanceof HTMLInputElement)
      ) {
        setEditing(false);
      }
    };

    window.addEventListener("keydown", leave);

    return () => window.removeEventListener("keydown", leave);
  }, [editing, setEditing]);

  useEffect(() => {
    if (!confirmDelete) return;

    const timer = setTimeout(
      () => setConfirmDelete(false),
      CONFIRM_MS,
    );

    return () => clearTimeout(timer);
  }, [confirmDelete]);

  useEffect(() => {
    if (!confirmReset) return;

    const timer = setTimeout(
      () => setConfirmReset(false),
      CONFIRM_MS,
    );

    return () => clearTimeout(timer);
  }, [confirmReset]);

  useEffect(() => {
    renameRef.current?.select();
  }, [renaming]);

  /** Retângulo encaixado do bloco para o ponteiro em (clientX, clientY). */
  const targetFor = useCallback(
    (current: Drag, clientX: number, clientY: number): Rect | null => {
      const grid = gridRef.current;

      if (!grid || pitch <= GRID_GAP) return null;

      const box = grid.getBoundingClientRect();

      if (current.mode === "resize") {
        return resizeRect(
          current.start,
          current.dir!,
          Math.round((clientX - current.startX) / pitch),
          Math.round((clientY - current.startY) / pitch),
          current.type,
          cols,
        );
      }

      if (current.mode === "add") {
        const inside =
          clientX >= box.left &&
          clientX <= box.right &&
          clientY >= box.top &&
          clientY <= box.bottom;

        if (!inside) return null;
      }

      const x =
        (clientX - box.left - current.grabX) / pitch;
      const y =
        (clientY - box.top - current.grabY) / pitch;

      return fitRect(
        {
          x,
          y,
          w: current.start.w,
          h: current.start.h,
        },
        current.type,
        cols,
      );
    },
    [pitch, cols],
  );

  // Enquanto algo está preso ao ponteiro, a janela inteira o acompanha.
  const holding = drag !== null;

  useEffect(() => {
    if (!holding) return;

    const move = (event: PointerEvent) => {
      const current = dragRef.current;

      if (!current) return;

      const moved =
        current.moved ||
        Math.hypot(
          event.clientX - current.startX,
          event.clientY - current.startY,
        ) >= DRAG_START_PX;

      if (!moved) return;

      event.preventDefault();

      if (
        event.clientY >
        window.innerHeight - AUTO_SCROLL_EDGE_PX
      ) {
        window.scrollBy(0, AUTO_SCROLL_STEP_PX);
      } else if (event.clientY < AUTO_SCROLL_EDGE_PX) {
        window.scrollBy(0, -AUTO_SCROLL_STEP_PX);
      }

      updateDrag({
        ...current,
        moved: true,
        clientX: event.clientX,
        clientY: event.clientY,
        rect: targetFor(
          current,
          event.clientX,
          event.clientY,
        ),
      });
    };

    const end = (event: PointerEvent) => {
      const current = dragRef.current;

      updateDrag(null);

      if (!current) return;

      const list = widgetsRef.current;

      if (!current.moved) {
        // Clique em um bloco da paleta: entra no primeiro lugar livre.
        if (
          current.mode === "add" &&
          event.type === "pointerup"
        ) {
          changeWidgets(
            addWidget(list, current.type, undefined, cols),
          );
        }

        return;
      }

      if (event.type !== "pointerup" || !current.rect) {
        return;
      }

      changeWidgets(
        placeWidget(list, {
          id: current.id,
          type: current.type,
          ...current.rect,
        }),
      );
    };

    // Esc solta o que está preso; sair da edição espera o próximo.
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.stopImmediatePropagation();
      updateDrag(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("keydown", escape, true);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("keydown", escape, true);
    };
  }, [holding, targetFor, changeWidgets, cols]);

  function begin(
    event: ReactPointerEvent,
    mode: Drag["mode"],
    type: MonitoringWidgetType,
    start: Rect,
    id: string,
    dir?: ResizeDir,
  ) {
    if (!editing || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const box = (
      (event.currentTarget as HTMLElement).closest(
        ".monitoring-board-widget",
      ) ?? (event.currentTarget as HTMLElement)
    ).getBoundingClientRect();

    // Blocos novos são pegos pelo meio; os demais, onde foram tocados.
    const grabX =
      mode === "add"
        ? (start.w * pitch - GRID_GAP) / 2
        : event.clientX - box.left;

    const grabY =
      mode === "add"
        ? Math.min(
            (start.h * pitch - GRID_GAP) / 2,
            40,
          )
        : event.clientY - box.top;

    updateDrag({
      mode,
      id,
      type,
      dir,
      start,
      startX: event.clientX,
      startY: event.clientY,
      grabX,
      grabY,
      moved: false,
      rect: mode === "add" ? null : start,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  function handleBarKeyDown(
    event: ReactKeyboardEvent,
    widget: BoardWidget,
  ) {
    if (!editing) return;

    const directions: Record<
      string,
      { dx: number; dy: number }
    > = {
      ArrowUp: { dx: 0, dy: -1 },
      ArrowDown: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0 },
      ArrowRight: { dx: 1, dy: 0 },
    };

    const step = directions[event.key];

    if (!step) return;

    event.preventDefault();

    if (widget.collapsed) return;

    if (event.shiftKey) {
      // Shift + seta redimensiona pelo canto inferior direito.
      const rect = resizeRect(
        widget,
        "se",
        step.dx,
        step.dy,
        widget.type,
        cols,
      );

      changeWidgets(
        placeWidget(widgets, { ...widget, ...rect }),
      );

      return;
    }

    const rect = fitRect(
      {
        ...widget,
        x: widget.x + step.dx,
        y: widget.y + step.dy,
      },
      widget.type,
      cols,
    );

    changeWidgets(placeWidget(widgets, { ...widget, ...rect }));
  }

  // O que a grade mostra: o arranjo como ficaria com o bloco no destino.
  const shown = useMemo(
    () =>
      drag?.moved && drag.rect
        ? placeWidget(widgets, {
            id: drag.id,
            type: drag.type,
            ...drag.rect,
          })
        : widgets,
    [widgets, drag],
  );

  const rows = Math.max(
    bottom(shown) + (editing ? EDIT_SPARE_ROWS : 0),
    editing ? 6 : 1,
  );

  const place = (rect: Rect): CSSProperties => ({
    width: rect.w * pitch - GRID_GAP,
    height: rect.h * pitch - GRID_GAP,
    transform: `translate(${rect.x * pitch}px, ${rect.y * pitch}px)`,
  });

  const gridBox = gridRef.current?.getBoundingClientRect();

  // A marca mostra onde o bloco preso vai cair, que pode ser acima do ponteiro.
  const landing =
    drag?.moved && drag.rect
      ? shown.find((widget) => widget.id === drag.id)
      : undefined;

  function commitRename(id: string, name: string) {
    renamePage(id, name);
    setRenaming(null);
  }

  function handleDeletePage() {
    if (locked) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setConfirmDelete(false);
    deletePage();
  }

  function handleResetPage() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }

    setConfirmReset(false);
    resetPage();
  }

  return (
    <div
      className={`monitoring-board${editing ? " is-editing" : ""}${
        drag?.moved ? " is-dragging" : ""
      }${narrow ? " is-narrow" : ""}`}
    >
      <header className="monitoring-board-toolbar">
        <div
          className="monitoring-board-tabs"
          role="tablist"
          aria-label="Páginas do painel"
        >
          {pages
            .filter((page) => isFixedPage(page.id))
            .map((page) => (
              <button
                key={page.id}
                type="button"
                role="tab"
                aria-selected={page.id === activePage.id}
                className={`monitoring-board-tab is-fixed${
                  page.id === activePage.id ? " is-active" : ""
                }`}
                onClick={() => selectPage(page.id)}
                title="Página fixa: o arranjo não pode ser alterado"
              >
                <LockSimpleIcon
                  className="monitoring-board-tab-lock"
                  aria-hidden="true"
                  weight="bold"
                />

                {page.name}

                <span className="monitoring-board-tab-count">
                  {page.widgets.length}
                </span>
              </button>
            ))}

          <button
            type="button"
            className="monitoring-board-tab-add"
            onClick={addPage}
            aria-label="Nova página"
            title="Nova página"
          >
            <PlusIcon aria-hidden="true" weight="bold" />
          </button>

          {pages
            .filter((page) => !isFixedPage(page.id))
            .map((page) =>
              renaming === page.id ? (
                <input
                  key={page.id}
                  ref={renameRef}
                  className="monitoring-board-tab-input"
                  defaultValue={page.name}
                  maxLength={32}
                  aria-label="Nome da página"
                  onBlur={(event) =>
                    commitRename(
                      page.id,
                      event.currentTarget.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitRename(
                        page.id,
                        event.currentTarget.value,
                      );
                    }

                    if (event.key === "Escape") {
                      setRenaming(null);
                    }
                  }}
                />
              ) : (
                <button
                  key={page.id}
                  type="button"
                  role="tab"
                  aria-selected={page.id === activePage.id}
                  className={`monitoring-board-tab${
                    page.id === activePage.id ? " is-active" : ""
                  }`}
                  onClick={() => selectPage(page.id)}
                  onDoubleClick={() => setRenaming(page.id)}
                  title="Clique duas vezes para renomear"
                >
                  {page.name}
                  <span className="monitoring-board-tab-count">
                    {page.widgets.length}
                  </span>
                </button>
              ),
            )}
        </div>

        <div className="monitoring-board-actions">
          {editing && isCustomized && (
            <button
              type="button"
              className={`monitoring-board-action is-reset${
                confirmReset ? " is-confirming" : ""
              }`}
              onClick={handleResetPage}
              title={
                confirmReset
                  ? "Clique de novo para restaurar"
                  : "Voltar esta página ao arranjo padrão"
              }
            >
              <ArrowCounterClockwiseIcon
                aria-hidden="true"
                weight="bold"
              />
              <span className="monitoring-board-label">
                {confirmReset ? "Confirmar?" : "Restaurar página"}
              </span>
            </button>
          )}

          {editing && (
            <>
              {cols !== GRID_COLS && (
                <span
                  className="monitoring-board-width-note"
                  title="Uma janela estreita tem um arranjo próprio. O layout da janela larga não muda."
                >
                  <GridFourIcon aria-hidden="true" weight="bold" />
                  <span className="monitoring-board-label">
                    Arranjo da janela estreita
                  </span>
                </span>
              )}

              <button
                type="button"
                className="monitoring-board-action"
                onClick={() => setRenaming(activePage.id)}
                title="Renomear esta página"
              >
                <PencilSimpleIcon
                  aria-hidden="true"
                  weight="bold"
                />
                <span className="monitoring-board-label">
                  Renomear
                </span>
              </button>

              <button
                type="button"
                className={`monitoring-board-action is-delete${
                  confirmDelete ? " is-confirming" : ""
                }`}
                onClick={handleDeletePage}
                title={
                  confirmDelete
                    ? "Clique de novo para excluir"
                    : "Excluir esta página"
                }
              >
                <TrashIcon aria-hidden="true" weight="bold" />
                <span className="monitoring-board-label">
                  {confirmDelete
                    ? "Confirmar?"
                    : "Excluir página"}
                </span>
              </button>
            </>
          )}

          {locked ? (
            <span
              className="monitoring-board-locked"
              title="Páginas fixas têm arranjo próprio. Crie uma página para personalizar."
            >
              <LockSimpleIcon aria-hidden="true" weight="bold" />
              <span className="monitoring-board-label">
                Página fixa
              </span>
            </span>
          ) : (
            <button
              type="button"
              className={`monitoring-board-action is-edit${
                editing ? " is-active" : ""
              }`}
              aria-pressed={editing}
              onClick={() => {
                setEditing(!editing);
                setConfirmDelete(false);
                setConfirmReset(false);
              }}
              title={
                editing
                  ? "Concluir a edição (Esc)"
                  : "Mover, redimensionar e adicionar blocos"
              }
            >
              {editing ? (
                <CheckIcon aria-hidden="true" weight="bold" />
              ) : (
                <SlidersHorizontalIcon
                  aria-hidden="true"
                  weight="bold"
                />
              )}
              <span className="monitoring-board-label">
                {editing ? "Concluir" : "Personalizar layout"}
              </span>
            </button>
          )}

          {toolbarExtra}
        </div>
      </header>

      <p
        className="monitoring-board-live"
        aria-live="polite"
        role="status"
      >
        {announcement}
      </p>

      {editing && (
        <p className="monitoring-board-hint">
          {narrow
            ? "Use as setas da barra para mover e Shift + setas para redimensionar. Arraste blocos da paleta para a grade."
            : "Arraste os blocos pela barra, redimensione pelas bordas ou use as setas (Shift + setas redimensiona)."}
        </p>
      )}

      <div className="monitoring-board-body" ref={boardRef}>
        <div className="monitoring-board-scroller">
          <div
            ref={gridRef}
            className="monitoring-board-grid"
            style={
              {
                height:
                  rows * pitch - GRID_GAP,
                "--board-pitch": `${pitch}px`,
              } as CSSProperties
            }
            role="list"
            aria-label="Blocos do monitoramento"
          >
            {cell > 0 && landing && (
              <div
                className="monitoring-board-placeholder"
                style={place(landing)}
                aria-hidden="true"
              />
            )}

            {cell > 0 &&
              shown.map((widget) => {
                const held =
                  drag?.moved && drag.id === widget.id;

                // O bloco movido segue o ponteiro; o destino é a marca.
                const style =
                  held &&
                  drag.mode === "move" &&
                  gridBox
                    ? {
                        ...place(widget),
                        transform: `translate(${
                          drag.clientX -
                          gridBox.left -
                          drag.grabX
                        }px, ${
                          drag.clientY -
                          gridBox.top -
                          drag.grabY
                        }px)`,
                      }
                    : place(widget);

                const spec = widgetSpec(widget.type);
                const bodyId = `monitoring-board-body-${widget.id}`;

                return (
                  <section
                    key={widget.id}
                    role="listitem"
                    aria-label={spec.label}
                    data-widget-id={widget.id}
                    data-widget-type={widget.type}
                    className={`monitoring-board-widget is-${widget.type}${
                      widget.collapsed ? " is-collapsed" : ""
                    }${held ? ` is-held is-${drag.mode}` : ""}`}
                    style={style}
                  >
                    <header
                      className="monitoring-board-widget-bar"
                      onPointerDown={
                        editing
                          ? (event) =>
                              begin(
                                event,
                                "move",
                                widget.type,
                                widget,
                                widget.id,
                              )
                          : undefined
                      }
                      onKeyDown={
                        editing
                          ? (event) =>
                              handleBarKeyDown(event, widget)
                          : undefined
                      }
                      tabIndex={editing ? 0 : undefined}
                      role={editing ? "button" : undefined}
                      aria-label={
                        editing
                          ? `${spec.label}: setas movem, Shift + setas redimensionam`
                          : undefined
                      }
                    >
                      {editing && (
                        <DotsSixVerticalIcon
                          className="monitoring-board-widget-grip"
                          aria-hidden="true"
                          weight="bold"
                        />
                      )}

                      <span className="monitoring-board-widget-title">
                        {spec.label}
                      </span>

                      <span className="monitoring-board-widget-actions">
                        {editing && (
                          <button
                            type="button"
                            className="monitoring-board-widget-action is-remove"
                            onPointerDown={(event) =>
                              event.stopPropagation()
                            }
                            onClick={() =>
                              removeBlock(widget.id)
                            }
                            aria-label={`Remover ${spec.label}`}
                            title="Remover"
                          >
                            <XIcon
                              aria-hidden="true"
                              weight="bold"
                            />
                          </button>
                        )}

                        {!locked && (
                          <button
                            type="button"
                            className="monitoring-board-widget-action"
                            onPointerDown={(event) =>
                              event.stopPropagation()
                            }
                            onClick={() =>
                              toggleCollapsed(widget.id)
                            }
                            aria-expanded={!widget.collapsed}
                            aria-controls={bodyId}
                            aria-label={`${
                              widget.collapsed
                                ? "Expandir"
                                : "Minimizar"
                            } ${spec.label}`}
                            title={
                              widget.collapsed
                                ? "Expandir"
                                : "Minimizar"
                            }
                          >
                            {widget.collapsed ? (
                              <PlusIcon
                                aria-hidden="true"
                                weight="bold"
                              />
                            ) : (
                              <MinusIcon
                                aria-hidden="true"
                                weight="bold"
                              />
                            )}
                          </button>
                        )}
                      </span>
                    </header>

                    <div
                      id={bodyId}
                      className="monitoring-board-widget-body"
                      hidden={widget.collapsed}
                    >
                      {contents[widget.type]}
                    </div>

                    {editing &&
                      !widget.collapsed &&
                      RESIZE_DIRECTIONS.map((dir) => (
                        <span
                          key={dir}
                          className={`monitoring-board-handle is-${dir}`}
                          onPointerDown={(event) =>
                            begin(
                              event,
                              "resize",
                              widget.type,
                              widget,
                              widget.id,
                              dir,
                            )
                          }
                          aria-hidden="true"
                        />
                      ))}
                  </section>
                );
              })}

            {editing && widgets.length === 0 && !drag?.moved && (
              <div className="monitoring-board-empty">
                <ChartBarIcon
                  className="monitoring-board-empty-icon"
                  aria-hidden="true"
                />
                <p>
                  Arraste visualizações e indicadores da paleta
                  para montar esta página.
                </p>
              </div>
            )}
          </div>
        </div>

        {editing && narrow && !paletteOpen && (
          <button
            type="button"
            className="monitoring-board-palette-open"
            onClick={() => setPaletteOpen(true)}
            title="Mostrar os blocos disponíveis"
          >
            <PlusIcon aria-hidden="true" weight="bold" />
            <span>Blocos</span>
          </button>
        )}

        {editing && (!narrow || paletteOpen) && (
          <aside
            className={`monitoring-board-palette${
              narrow ? " is-overlay" : ""
            }`}
            aria-label="Blocos disponíveis"
          >
            {narrow && (
              <button
                type="button"
                className="monitoring-board-palette-close"
                onClick={() => setPaletteOpen(false)}
                aria-label="Recolher a paleta"
                title="Recolher"
              >
                <XIcon aria-hidden="true" weight="bold" />
              </button>
            )}

            {PALETTE_GROUPS.map((group) => (
              <section
                key={group.kind}
                className="monitoring-board-palette-group"
              >
                <h3>{group.title}</h3>

                {MONITORING_WIDGETS.filter(
                  (spec) => spec.kind === group.kind,
                ).map((spec) => (
                  <button
                    key={spec.type}
                    type="button"
                    className="monitoring-board-palette-item"
                    onPointerDown={(event) =>
                      begin(
                        event,
                        "add",
                        spec.type,
                        fitRect(
                          {
                            x: 0,
                            y: 0,
                            w: Math.min(spec.w, cols),
                            h: spec.h,
                          },
                          spec.type,
                          cols,
                        ),
                        newWidgetId(spec.type),
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        addBlock(spec.type);
                      }
                    }}
                    title="Arraste para o painel ou clique para adicionar"
                  >
                    <span
                      className={`monitoring-board-palette-glyph is-${spec.kind}`}
                    >
                      {WIDGET_ICONS[spec.type]}
                    </span>
                    <span>{spec.label}</span>
                  </button>
                ))}
              </section>
            ))}

            <p className="monitoring-board-palette-hint">
              Arraste um bloco para a grade ou clique nele para
              ocupar o primeiro espaço livre. O arranjo fica
              salvo neste navegador.
            </p>
          </aside>
        )}

        {drag?.moved &&
          drag.mode === "add" &&
          !drag.rect &&
          cell > 0 && (
            // Fora da grade, o bloco novo é um cartão sob o cursor.
            <div
              className={`monitoring-board-widget monitoring-board-ghost is-${drag.type}`}
              style={{
                width: drag.start.w * pitch - GRID_GAP,
                height: drag.start.h * pitch - GRID_GAP,
                transform: `translate(${
                  drag.clientX - drag.grabX
                }px, ${drag.clientY - drag.grabY}px)`,
              }}
              aria-hidden="true"
            >
              <div className="monitoring-board-widget-body">
                {contents[drag.type]}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

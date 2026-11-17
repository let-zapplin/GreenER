import {
  useEffect,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  DotsSixVerticalIcon,
  MinusIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";

import type { WidgetLayout } from "../hooks/useWidgetLayout";

import "./DashboardGrid.css";

export type DashboardWidget<Id extends string> = {
  id: Id;
  title: string;
  content: ReactNode;
  /*
   * Mantém o conteúdo montado (apenas oculto) quando minimizado.
   * Usado no mapa: desmontar o MapLibre perderia câmera, seleção
   * e obrigaria recarregar os tiles ao expandir.
   */
  keepMountedWhenCollapsed?: boolean;
};

type DashboardGridProps<Id extends string> = {
  label: string;
  layout: WidgetLayout<Id>;
  widgets: readonly DashboardWidget<Id>[];
  toolbarExtra?: ReactNode;
};

const DRAG_MIME = "application/x-greener-widget";

/*
 * Arrastar só faz sentido com ponteiro preciso. Em toque o
 * HTML5 drag-and-drop é inconsistente, então o fallback são
 * os botões de mover (que também atendem teclado).
 */
function useFinePointer(): boolean {
  const query = "(hover: hover) and (pointer: fine)";

  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);

    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  return matches;
}

export function DashboardGrid<Id extends string>({
  label,
  layout,
  widgets,
  toolbarExtra,
}: DashboardGridProps<Id>) {
  const {
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
  } = layout;

  const canDrag = useFinePointer() && isEditing;

  const [draggingId, setDraggingId] = useState<Id | null>(null);
  const [dropTargetId, setDropTargetId] = useState<Id | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraggingId(null);
      setDropTargetId(null);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;

    function exitOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setEditing(false);
    }

    document.addEventListener("keydown", exitOnEscape);

    return () => document.removeEventListener("keydown", exitOnEscape);
  }, [isEditing, setEditing]);

  const widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));

  function handleDragStart(event: DragEvent<HTMLElement>, id: Id) {
    event.dataTransfer.effectAllowed = "move";
    // Firefox só inicia o arraste se houver algum dado.
    event.dataTransfer.setData(DRAG_MIME, id);
    event.dataTransfer.setData("text/plain", id);

    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, id: Id) {
    if (draggingId === null || draggingId === id) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dropTargetId !== id) setDropTargetId(id);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>, id: Id) {
    const next = event.relatedTarget;

    if (next instanceof Node && event.currentTarget.contains(next)) return;

    if (dropTargetId === id) setDropTargetId(null);
  }

  function handleDrop(event: DragEvent<HTMLElement>, id: Id) {
    event.preventDefault();

    if (draggingId !== null && draggingId !== id) {
      moveTo(draggingId, order.indexOf(id));
    }

    handleDragEnd();
  }

  return (
    <div className={`dashboard-grid-root ${isEditing ? "is-editing" : ""}`}>
      <div className="dashboard-grid-toolbar">
        <div className="dashboard-grid-toolbar-main">
          <button
            type="button"
            className={`dashboard-grid-edit-toggle ${
              isEditing ? "is-active" : ""
            }`}
            aria-pressed={isEditing}
            onClick={() => setEditing(!isEditing)}
          >
            {isEditing ? (
              <CheckIcon aria-hidden="true" weight="bold" />
            ) : (
              <SlidersHorizontalIcon aria-hidden="true" weight="bold" />
            )}

            {isEditing ? "Concluir" : "Personalizar layout"}
          </button>

          {isCustomized && (
            <button
              type="button"
              className="dashboard-grid-reset"
              onClick={reset}
            >
              <ArrowCounterClockwiseIcon aria-hidden="true" weight="bold" />
              Restaurar padrão
            </button>
          )}

          {isEditing && (
            <p className="dashboard-grid-hint">
              {canDrag
                ? "Arraste pela barra de título ou use as setas para reorganizar."
                : "Use as setas para reorganizar os blocos."}
            </p>
          )}
        </div>

        {toolbarExtra}
      </div>

      <p className="dashboard-grid-live" aria-live="polite" role="status">
        {announcement}
      </p>

      <div className="dashboard-grid" role="list" aria-label={label}>
        {placements.map((placement, index) => {
          const widget = widgetsById.get(placement.id);

          if (!widget) return null;

          const { id, title, content, keepMountedWhenCollapsed } = widget;
          const { collapsed, span } = placement;
          const bodyId = `dashboard-widget-body-${id}`;
          const isFirst = index === 0;
          const isLast = index === placements.length - 1;

          const className = [
            "dashboard-widget",
            collapsed && "is-collapsed",
            draggingId === id && "is-dragging",
            dropTargetId === id && "is-drop-target",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <section
              key={id}
              role="listitem"
              aria-label={title}
              data-widget-id={id}
              className={className}
              style={{ "--widget-span": span } as CSSProperties}
              onDragOver={(event) => handleDragOver(event, id)}
              onDragLeave={(event) => handleDragLeave(event, id)}
              onDrop={(event) => handleDrop(event, id)}
            >
              <header
                className="dashboard-widget-bar"
                draggable={canDrag}
                onDragStart={
                  canDrag ? (event) => handleDragStart(event, id) : undefined
                }
                onDragEnd={canDrag ? handleDragEnd : undefined}
              >
                {canDrag && (
                  <DotsSixVerticalIcon
                    className="dashboard-widget-grip"
                    aria-hidden="true"
                    weight="bold"
                  />
                )}

                <span className="dashboard-widget-title">{title}</span>

                <div className="dashboard-widget-actions">
                  {isEditing && (
                    <>
                      <button
                        type="button"
                        className="dashboard-widget-action"
                        onClick={() => moveBy(id, -1)}
                        disabled={isFirst}
                        aria-label={`Mover ${title} para antes`}
                        title="Mover para antes"
                      >
                        <ArrowUpIcon aria-hidden="true" weight="bold" />
                      </button>

                      <button
                        type="button"
                        className="dashboard-widget-action"
                        onClick={() => moveBy(id, 1)}
                        disabled={isLast}
                        aria-label={`Mover ${title} para depois`}
                        title="Mover para depois"
                      >
                        <ArrowDownIcon aria-hidden="true" weight="bold" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="dashboard-widget-action"
                    onClick={() => toggleCollapsed(id)}
                    aria-expanded={!collapsed}
                    aria-controls={bodyId}
                    aria-label={`${collapsed ? "Expandir" : "Minimizar"} ${title}`}
                    title={collapsed ? "Expandir" : "Minimizar"}
                  >
                    {collapsed ? (
                      <PlusIcon aria-hidden="true" weight="bold" />
                    ) : (
                      <MinusIcon aria-hidden="true" weight="bold" />
                    )}
                  </button>
                </div>
              </header>

              <div
                id={bodyId}
                className="dashboard-widget-body"
                hidden={collapsed}
              >
                {(!collapsed || keepMountedWhenCollapsed) && content}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

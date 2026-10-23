import { useMemo, useRef, useState } from "react";
import { useToast } from "@/components/shell/Toasts";
import type { ActionResult } from "@/lib/action";
import type { TaskRow } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { applyMove, dropIndex, keyboardMoveIndex, neighboursAt, type KeyboardMove } from "@/lib/tasks";
import { TaskCard } from "./TaskCard";

export interface BoardColumn {
  key: string;
  title: string;
  /** All cards of the step (the column may show fewer, e.g. Done of the last 14 days). */
  count: number;
  tasks: TaskRow[];
  /** Under the cards (e.g. "+ Add a task"). */
  footer?: React.ReactNode;
}

/** Where a card goes: the column, its index among the column's other cards, and the cards it lands between. */
export interface BoardMove {
  toKey: string;
  index: number;
  previousTaskId?: string;
  nextTaskId?: string;
}

/**
 * Columns of cards. Mouse: the browser's own drag and drop (no library); keyboard and phone: each card's Move menu.
 * While a move is saved the card is shown in its new place; if the API refuses, it jumps back and the reason is shown.
 * On a phone one column shows at a time, chosen above the cards. `allowsOrdering` false = no manual order (My tasks).
 */
export function TaskBoard({ label, columns, allowsOrdering, canMove, onMove, onOpen }: {
  label: string;
  columns: BoardColumn[];
  allowsOrdering: boolean;
  canMove: (task: TaskRow) => boolean;
  onMove: (task: TaskRow, move: BoardMove) => Promise<ActionResult<unknown>>;
  onOpen: (task: TaskRow) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [pendingMove, setPendingMove] = useState<{ taskId: string; toKey: string; index: number } | null>(null);
  const [dragging, setDragging] = useState<TaskRow | null>(null);
  const [dropTarget, setDropTarget] = useState<{ key: string; index: number } | null>(null);
  const [phoneColumn, setPhoneColumn] = useState(columns[0]?.key ?? "");
  const [announcement, setAnnouncement] = useState("");
  const lists = useRef<Record<string, HTMLDivElement | null>>({});

  const shown = useMemo(() => {
    const asCards = columns.map((column) => ({ key: column.key, cards: column.tasks }));
    const moved = pendingMove ? applyMove(asCards, pendingMove) : asCards;
    return columns.map((column, i) => ({ ...column, tasks: moved[i].cards }));
  }, [columns, pendingMove]);
  const targets = columns.map((column) => ({ key: column.key, title: column.title }));
  const currentPhoneColumn = columns.some((column) => column.key === phoneColumn) ? phoneColumn : columns[0]?.key;

  const move = async (task: TaskRow, toKey: string, index: number) => {
    const column = shown.find((candidate) => candidate.key === toKey);
    if (!column) return;
    const neighbours = allowsOrdering ? neighboursAt(column.tasks.map((card) => card.id), task.id, index) : {};
    setPendingMove({ taskId: task.id, toKey, index });
    const result = await onMove(task, { toKey, index, ...neighbours });
    setPendingMove(null);
    if (!result.ok) { toast(result.error, "bad"); return; }
    setAnnouncement(t("{key} moved to {status}", { key: task.key ?? task.title, status: column.title }));
  };

  const columnOf = (task: TaskRow) => shown.find((column) => column.tasks.some((card) => card.id === task.id));
  const moveWithin = (task: TaskRow, keyboardMove: KeyboardMove) => {
    const column = columnOf(task);
    if (!column) return;
    const index = column.tasks.findIndex((card) => card.id === task.id);
    const target = keyboardMoveIndex(index, column.tasks.length, keyboardMove);
    if (target !== null) void move(task, column.key, target);
  };

  /** The drop index from the pointer, measured against the other cards of the column. */
  const indexAt = (key: string, pointerY: number) => {
    const cards = [...(lists.current[key]?.querySelectorAll<HTMLElement>("[data-task-id]") ?? [])].filter((card) => card.dataset.taskId !== dragging?.id);
    return dropIndex(cards.map((card) => { const bounds = card.getBoundingClientRect(); return bounds.top + bounds.height / 2; }), pointerY);
  };

  return (
    <div className="board-wrap">
      <label className="board-switch field">
        {t("Step")}
        <select value={currentPhoneColumn} onChange={(e) => setPhoneColumn(e.target.value)}>
          {shown.map((column) => <option key={column.key} value={column.key}>{column.title} ({column.count})</option>)}
        </select>
      </label>
      <div className="board" aria-label={label} role="group">
        {shown.map((column) => {
          const isDropHere = dropTarget?.key === column.key;
          const others = column.tasks.filter((card) => card.id !== dragging?.id);
          return (
            <section key={column.key} className={`board-col${column.key === currentPhoneColumn ? " is-current" : ""}${isDropHere ? " is-drop" : ""}`}>
              <h3 className="board-col-h"><span>{column.title}</span><span className="tcount">{column.count}</span></h3>
              <div role="list" aria-label={`${column.title} (${column.count})`} className="board-list" ref={(element) => { lists.current[column.key] = element; }}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  const index = allowsOrdering ? indexAt(column.key, e.clientY) : others.length;
                  if (dropTarget?.key !== column.key || dropTarget.index !== index) setDropTarget({ key: column.key, index });
                }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const task = dragging;
                  const index = allowsOrdering ? indexAt(column.key, e.clientY) : others.length;
                  setDropTarget(null);
                  setDragging(null);
                  if (!task) return;
                  const from = columnOf(task);
                  const fromIndex = from?.tasks.findIndex((card) => card.id === task.id) ?? -1;
                  if (from?.key === column.key && (!allowsOrdering || fromIndex === index)) return;
                  void move(task, column.key, index);
                }}>
                {column.tasks.map((task) => {
                  // the dragged card stays in the page (removing it would end the drag); the drop line counts the other cards
                  const otherIndex = others.indexOf(task);
                  return (
                    <div key={task.id} style={{ display: "contents" }}>
                      {isDropHere && otherIndex >= 0 && dropTarget.index === otherIndex && <div className="board-drop" aria-hidden="true"></div>}
                      <TaskCard task={task} canMove={canMove(task)} isDragging={dragging?.id === task.id} targets={targets} currentKey={column.key} allowsOrdering={allowsOrdering}
                        onOpen={onOpen} onDragStart={setDragging} onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                        onMoveTo={(movedTask, key) => void move(movedTask, key, shown.find((candidate) => candidate.key === key)?.tasks.filter((card) => card.id !== movedTask.id).length ?? 0)} onMoveWithin={moveWithin} />
                    </div>
                  );
                })}
                {isDropHere && dropTarget.index >= others.length && <div className="board-drop" aria-hidden="true"></div>}
                {!column.tasks.length && !isDropHere && <p className="board-empty muted">{t("No tasks")}</p>}
              </div>
              {column.footer}
            </section>
          );
        })}
      </div>
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import type { TaskRow } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import type { KeyboardMove } from "@/lib/tasks";
import { DueLabel } from "./DueLabel";
import { LabelChips } from "./LabelChips";
import { PriorityLabel } from "./PriorityLabel";

interface MoveTarget { key: string; title: string }

/** The keyboard and phone way to move a card: pick a step, or move it up / down inside its column. */
function MoveMenu({ taskRef, targets, currentKey, allowsOrdering, onMoveTo, onMoveWithin }: {
  taskRef: string; targets: MoveTarget[]; currentKey: string; allowsOrdering: boolean;
  onMoveTo: (key: string) => void; onMoveWithin: (move: KeyboardMove) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    wrap.current?.querySelector<HTMLElement>("[role=menuitemradio][aria-checked=true], [role=menuitemradio]")?.focus();
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const choose = (run: () => void) => { setOpen(false); run(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); setOpen(false); wrap.current?.querySelector<HTMLElement>("button")?.focus(); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(wrap.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  };
  return (
    <div className="task-move" ref={wrap} onKeyDown={onKey}>
      <button type="button" className="icon-btn task-move-btn" aria-label={t("Move {key}", { key: taskRef })} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen(!open)}>
        <Icon name="drag" size={15} />
      </button>
      {open && (
        <div className="menu task-move-menu" role="menu" id={menuId} aria-label={t("Move {key}", { key: taskRef })}>
          <div className="pal-g">{t("Move to")}</div>
          {targets.map((target) => (
            <button key={target.key} type="button" role="menuitemradio" aria-checked={target.key === currentKey} onClick={() => choose(() => target.key !== currentKey && onMoveTo(target.key))}>
              <Icon name={target.key === currentKey ? "ok" : "arrow"} size={14} />{target.title}
            </button>
          ))}
          {allowsOrdering && (
            <>
              <div className="sep"></div>
              <button type="button" role="menuitem" onClick={() => choose(() => onMoveWithin("up"))}>{t("Move up")}</button>
              <button type="button" role="menuitem" onClick={() => choose(() => onMoveWithin("down"))}>{t("Move down")}</button>
              <button type="button" role="menuitem" onClick={() => choose(() => onMoveWithin("top"))}>{t("To top")}</button>
              <button type="button" role="menuitem" onClick={() => choose(() => onMoveWithin("bottom"))}>{t("To bottom")}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One board card: key, title, labels, priority, due, the direct assignee (and a smaller avatar for the accountable
 * person), sub-task / checklist / comment counts. Draggable when the user may move it; the Move menu is the keyboard path.
 */
export function TaskCard({ task, canMove, isDragging, targets, currentKey, allowsOrdering, onOpen, onDragStart, onDragEnd, onMoveTo, onMoveWithin }: {
  task: TaskRow; canMove: boolean; isDragging: boolean; targets: MoveTarget[]; currentKey: string; allowsOrdering: boolean;
  onOpen: (task: TaskRow) => void; onDragStart: (task: TaskRow) => void; onDragEnd: () => void;
  onMoveTo: (task: TaskRow, key: string) => void; onMoveWithin: (task: TaskRow, move: KeyboardMove) => void;
}) {
  const t = useT();
  const ref = task.key ?? task.id;
  return (
    <div role="listitem" data-task-id={task.id} className={`task-card${isDragging ? " dragging" : ""}${canMove ? " movable" : ""}`}
      draggable={canMove}
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; onDragStart(task); }}
      onDragEnd={onDragEnd}>
      <div className="task-card-top">
        <span className="task-key">{task.key ?? t("Personal")}{task.parentKey && <> · ↳ {task.parentKey}</>}</span>
        {canMove && <MoveMenu taskRef={ref} targets={targets} currentKey={currentKey} allowsOrdering={allowsOrdering} onMoveTo={(key) => onMoveTo(task, key)} onMoveWithin={(move) => onMoveWithin(task, move)} />}
      </div>
      <Link href={`/tasks/${encodeURIComponent(ref)}`} className="task-card-title" onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onOpen(task); }}>
        {task.title}
      </Link>
      <LabelChips labels={task.labels} />
      <div className="task-meta">
        <PriorityLabel priority={task.priority} />
        <DueLabel task={task} />
        {task.checklistCount > 0 && <span className="task-count" title={t("Checklist")}><Icon name="check" size={12} />{task.checklistDoneCount}/{task.checklistCount}</span>}
        {task.subtaskCount > 0 && <span className="task-count" title={t("Sub-tasks")}><Icon name="tasks" size={12} />{task.subtaskDoneCount}/{task.subtaskCount}</span>}
        {task.commentCount > 0 && <span className="task-count" title={t("Comments")}><Icon name="comment" size={12} />{task.commentCount}</span>}
        <span className="task-people">
          {task.assigneeId && task.assigneeName && <Avatar id={task.assigneeId} name={task.assigneeName} photo={task.assigneePhoto} style={{ width: 26, height: 26, fontSize: 10.5 }} />}
          {task.indirectAssigneeId && task.indirectAssigneeName && (
            <span title={t("Accountable: {name}", { name: task.indirectAssigneeName })} className="task-accountable">
              <Avatar id={task.indirectAssigneeId} name={task.indirectAssigneeName} photo={task.indirectAssigneePhoto} style={{ width: 20, height: 20, fontSize: 8.5 }} />
              <span className="sr-only">{t("Accountable: {name}", { name: task.indirectAssigneeName })}</span>
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

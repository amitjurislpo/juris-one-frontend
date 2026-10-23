import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import type { TaskDetail } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { createTask } from "@/pages/tasks/actions";
import { changeTaskCategory } from "./changeTaskCategory";
import { StatusChip } from "./StatusChip";

/** Sub-tasks of a task: tick to finish, open one, add one (same project). */
export function SubtaskList({ task, canAdd, canTick }: { task: TaskDetail; canAdd: boolean; canTick: boolean }) {
  const t = useT();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [busy, start] = useTransition();
  const done = task.subtasks.filter((subtask) => subtask.statusCategory === "DONE").length;
  const add = () => start(async () => {
    if (!title.trim()) return;
    const result = await createTask({ title: title.trim(), projectId: task.projectId, parentTaskId: task.id });
    if (result.ok) { setTitle(""); toast(t("Sub-task added")); } else toast(result.error, "bad");
  });
  if (!task.subtasks.length && !canAdd) return null;
  return (
    <section className="task-section" aria-labelledby={`subtasks-${task.id}`}>
      <div className="task-section-h">
        <h3 id={`subtasks-${task.id}`}>{t("Sub-tasks")} {task.subtasks.length > 0 && <span className="muted">({t("{done}/{total} done", { done, total: task.subtasks.length })})</span>}</h3>
        {canAdd && !isAdding && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setIsAdding(true)}><Icon name="plus" size={13} />{t("Sub-task")}</button>}
      </div>
      <ul className="task-checklist">
        {task.subtasks.map((subtask) => (
          <li key={subtask.id}>
            <input type="checkbox" checked={subtask.statusCategory === "DONE"} disabled={!canTick || busy} aria-label={t("Mark {title} done", { title: subtask.title })}
              onChange={(e) => start(async () => { const result = await changeTaskCategory(subtask, e.target.checked ? "DONE" : "TODO"); if (!result.ok) toast(result.error, "bad"); })} />
            <Link href={`/tasks/${encodeURIComponent(subtask.key ?? subtask.id)}`} className="task-key">{subtask.key ?? t("Personal")}</Link>
            <span className={subtask.statusCategory === "DONE" ? "task-done-text" : undefined}>{subtask.title}</span>
            <StatusChip name={subtask.statusName} category={subtask.statusCategory} color={subtask.statusColor} />
          </li>
        ))}
      </ul>
      {isAdding && (
        <form className="task-inline-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input value={title} autoFocus maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder={t("Sub-task title")} aria-label={t("Sub-task title")}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setIsAdding(false); } }} />
          <button className="btn btn-sm btn-gold" disabled={busy || !title.trim()}>{t("Add")}</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setIsAdding(false)}>{t("Cancel")}</button>
        </form>
      )}
    </section>
  );
}

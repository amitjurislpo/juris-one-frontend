import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import type { TaskChecklistItem } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { addChecklistItem, deleteChecklistItem, updateChecklistItem } from "@/pages/tasks/actions";

/** The task's checklist: tick items, rename on click, remove, add. Read-only without `canEdit`. */
export function ChecklistEditor({ taskId, items, canEdit }: { taskId: string; items: TaskChecklistItem[]; canEdit: boolean }) {
  const t = useT();
  const toast = useToast();
  const [text, setText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busy, start] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => start(async () => {
    const result = await action();
    if (result.ok) after?.(); else toast(result.error ?? "", "bad");
  });
  const done = items.filter((item) => item.isDone).length;
  if (!items.length && !canEdit) return null;
  return (
    <section className="task-section" aria-labelledby={`checklist-${taskId}`}>
      <div className="task-section-h">
        <h3 id={`checklist-${taskId}`}>{t("Checklist")} {items.length > 0 && <span className="muted">({t("{done}/{total} done", { done, total: items.length })})</span>}</h3>
        {canEdit && !isAdding && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setIsAdding(true)}><Icon name="plus" size={13} />{t("Item")}</button>}
      </div>
      <ul className="task-checklist">
        {[...items].sort((first, second) => first.position - second.position).map((item) => (
          <li key={item.id}>
            <input type="checkbox" checked={item.isDone} disabled={!canEdit || busy} aria-label={item.text}
              onChange={(e) => run(() => updateChecklistItem(taskId, item.id, { isDone: e.target.checked }))} />
            {editing?.id === item.id ? (
              <input value={editing.text} autoFocus maxLength={300} aria-label={t("Checklist item")} onChange={(e) => setEditing({ id: item.id, text: e.target.value })}
                onBlur={() => { const next = editing.text.trim(); setEditing(null); if (next && next !== item.text) run(() => updateChecklistItem(taskId, item.id, { text: next })); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.stopPropagation(); setEditing(null); } }} />
            ) : canEdit ? (
              <button type="button" className="linkish task-item-text" onClick={() => setEditing({ id: item.id, text: item.text })}><span className={item.isDone ? "task-done-text" : undefined}>{item.text}</span></button>
            ) : <span className={item.isDone ? "task-done-text" : undefined}>{item.text}</span>}
            {canEdit && <button type="button" className="btn btn-sm btn-ghost" aria-label={t("Remove {item}", { item: item.text })} onClick={() => run(() => deleteChecklistItem(taskId, item.id))}><Icon name="x" size={13} /></button>}
          </li>
        ))}
      </ul>
      {isAdding && (
        <form className="task-inline-add" onSubmit={(e) => { e.preventDefault(); const next = text.trim(); if (next) run(() => addChecklistItem(taskId, next), () => setText("")); }}>
          <input value={text} autoFocus maxLength={300} onChange={(e) => setText(e.target.value)} placeholder={t("New checklist item")} aria-label={t("New checklist item")}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setIsAdding(false); } }} />
          <button className="btn btn-sm btn-gold" disabled={busy || !text.trim()}>{t("Add")}</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setIsAdding(false)}>{t("Done")}</button>
        </form>
      )}
    </section>
  );
}

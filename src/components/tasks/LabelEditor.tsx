import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { TaskLabel } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { colorTone, PROJECT_COLORS } from "@/lib/tasks";
import { createTaskLabel, deleteTaskLabel, updateTaskLabel } from "@/pages/projects/actions";

/** Labels of a project (`projectId`) or of the whole business (none): chips to rename, recolour or remove, and a form to add one. */
export function LabelEditor({ labels, projectId, canEdit }: { labels: TaskLabel[]; projectId?: string; canEdit: boolean }) {
  const t = useT();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [draft, setDraft] = useState({ name: "", color: "blue" });
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);
  const [removing, setRemoving] = useState<TaskLabel | null>(null);
  const own = labels.filter((label) => (projectId ? label.projectId === projectId : !label.projectId));
  const run = (action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>, success: string, after?: () => void) => start(async () => {
    const result = await action();
    if (result.ok) { toast(result.message ?? success); after?.(); } else toast(result.error, "bad");
  });
  const colorSelect = (value: string, onChange: (color: string) => void, label: string) => (
    <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(PROJECT_COLORS).map(([colorValue, color]) => <option key={colorValue} value={colorValue}>{t(color.label)}</option>)}
    </select>
  );
  return (
    <div className="label-editor">
      {!own.length && <p className="muted">{t("No labels yet.")}</p>}
      <ul className="label-editor-list">
        {own.map((label) => (
          <li key={label.id}>
            {editing?.id === label.id ? (
              <form className="task-inline-add" onSubmit={(e) => { e.preventDefault(); if (editing.name.trim()) run(() => updateTaskLabel(label.id, { name: editing.name.trim(), color: editing.color }), t("Label saved"), () => setEditing(null)); }}>
                <input value={editing.name} autoFocus maxLength={40} aria-label={t("Label name")} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                {colorSelect(editing.color, (color) => setEditing({ ...editing, color }), t("Label colour"))}
                <button className="btn btn-sm btn-gold" disabled={busy}>{t("Save")}</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>{t("Cancel")}</button>
              </form>
            ) : (
              <>
                <span className={`chip nodot task-label ${colorTone(label.color)}`}>{label.name}</span>
                {canEdit && (
                  <>
                    <button type="button" className="btn btn-sm btn-ghost" aria-label={t("Edit label {name}", { name: label.name })} onClick={() => setEditing({ id: label.id, name: label.name, color: label.color ?? "grey" })}><Icon name="edit" size={13} /></button>
                    <button type="button" className="btn btn-sm btn-ghost" aria-label={t("Delete label {name}", { name: label.name })} onClick={() => setRemoving(label)}><Icon name="trash" size={13} /></button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form className="task-inline-add" onSubmit={(e) => { e.preventDefault(); if (draft.name.trim()) run(() => createTaskLabel({ name: draft.name.trim(), color: draft.color, ...(projectId ? { projectId } : {}) }), t("Label added"), () => setDraft({ ...draft, name: "" })); }}>
          <input value={draft.name} maxLength={40} placeholder={t("New label")} aria-label={t("New label")} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          {colorSelect(draft.color, (color) => setDraft({ ...draft, color }), t("Label colour"))}
          <button className="btn btn-sm btn-gold" disabled={busy || !draft.name.trim()}><Icon name="plus" size={13} />{t("Add label")}</button>
        </form>
      )}
      {removing && (
        <ConfirmDialog title={t("Delete label")} danger confirm={t("Delete")} busy={busy} onClose={() => setRemoving(null)}
          body={t("The label {name} is removed from every task that has it.", { name: removing.name })}
          onConfirm={() => run(() => deleteTaskLabel(removing.id), t("Label deleted"), () => setRemoving(null))} />
      )}
    </div>
  );
}

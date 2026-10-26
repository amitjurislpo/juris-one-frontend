import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action";
import type { TaskStatusCategory, WorkflowStatus } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { PROJECT_COLORS, STATUS_CATEGORIES, statusName } from "@/lib/tasks";

type StatusInput = { name: string; category: TaskStatusCategory; color: string | null };

/**
 * The steps of a workflow (a project's, or the business default): rename, category, colour, the step new tasks start
 * in, order (↑ ↓), add and remove (a step that still has tasks asks where to move them). The API keeps the rules
 * (at least one To do and one Done step, at most 12). Read-only without `canEdit`.
 */
export function WorkflowEditor({ statuses, canEdit, onCreate, onUpdate, onReorder, onDelete }: {
  statuses: WorkflowStatus[]; canEdit: boolean;
  onCreate: (input: StatusInput) => Promise<ActionResult<{ id: string }>>;
  onUpdate: (statusId: string, input: StatusInput & { isInitial: boolean }) => Promise<ActionResult>;
  onReorder: (statusIds: string[]) => Promise<ActionResult>;
  onDelete: (statusId: string, moveTasksToStatusId?: string) => Promise<ActionResult>;
}) {
  const t = useT();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [draft, setDraft] = useState<StatusInput>({ name: "", category: "IN_PROGRESS", color: null });
  const [removing, setRemoving] = useState<WorkflowStatus | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const ordered = [...statuses].sort((first, second) => first.position - second.position);
  const run = (action: () => Promise<ActionResult<unknown>>, success?: string, after?: () => void) => start(async () => {
    const result = await action();
    if (result.ok) { if (success) toast(result.message ?? success); after?.(); } else toast(result.error, "bad");
  });
  const update = (status: WorkflowStatus, changes: Partial<StatusInput & { isInitial: boolean }>) =>
    run(() => onUpdate(status.id, { name: status.name, category: status.category, color: status.color, isInitial: status.isInitial, ...changes }));
  const swap = (index: number, offset: number) => {
    const ids = ordered.map((status) => status.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    run(() => onReorder(ids));
  };

  return (
    <div className="workflow-editor">
      <ul className="workflow-rows">
        {ordered.map((status, index) => (
          <li key={status.id ?? status.name} className="workflow-row">
            {/* the business's built-in steps have no id until its default set is stored (first add): shown read-only until then */}
            {canEdit && status.id ? (
              <>
                <input defaultValue={status.name} key={`${status.id}-${status.name}`} maxLength={30} aria-label={t("Name of step {name}", { name: status.name })}
                  onBlur={(e) => { const name = e.target.value.trim(); if (name && name !== status.name) update(status, { name }); }} />
                <select value={status.category} aria-label={t("Category of {name}", { name: status.name })} onChange={(e) => update(status, { category: e.target.value as TaskStatusCategory })}>
                  {Object.entries(STATUS_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                </select>
                <select value={status.color ?? ""} aria-label={t("Colour of {name}", { name: status.name })} onChange={(e) => update(status, { color: e.target.value || null })}>
                  <option value="">{t("No colour")}</option>
                  {Object.entries(PROJECT_COLORS).map(([value, color]) => <option key={value} value={value}>{t(color.label)}</option>)}
                </select>
                <label className="workflow-initial" title={t("New tasks start here")}>
                  <input type="radio" name="initial-status" checked={status.isInitial} disabled={status.category !== "TODO"} onChange={() => update(status, { isInitial: true })} />
                  <span>{t("Start")}</span>
                </label>
                <span className="muted workflow-count">{status.taskCount === 1 ? t("1 task") : t("{n} tasks", { n: status.taskCount })}</span>
                <span className="workflow-buttons">
                  <button type="button" className="btn btn-sm btn-ghost" disabled={busy || index === 0} aria-label={t("Move {name} up", { name: status.name })} onClick={() => swap(index, -1)}>↑</button>
                  <button type="button" className="btn btn-sm btn-ghost" disabled={busy || index === ordered.length - 1} aria-label={t("Move {name} down", { name: status.name })} onClick={() => swap(index, 1)}>↓</button>
                  <button type="button" className="btn btn-sm btn-ghost" disabled={busy} aria-label={t("Remove step {name}", { name: status.name })} onClick={() => { setRemoving(status); setMoveTo(""); }}><Icon name="x" size={13} /></button>
                </span>
              </>
            ) : (
              <>
                <b>{statusName(status.name, t)}</b>
                <span className="muted">{t(STATUS_CATEGORIES[status.category])}{status.isInitial ? ` · ${t("new tasks start here")}` : ""}</span>
                <span className="muted workflow-count">{status.taskCount === 1 ? t("1 task") : t("{n} tasks", { n: status.taskCount })}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form className="workflow-add" onSubmit={(e) => { e.preventDefault(); if (draft.name.trim()) run(() => onCreate({ ...draft, name: draft.name.trim() }), t("Step added"), () => setDraft({ name: "", category: "IN_PROGRESS", color: null })); }}>
          <input value={draft.name} maxLength={30} placeholder={t("New step, e.g. Blocked")} aria-label={t("Name of the new step")} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select value={draft.category} aria-label={t("Category of the new step")} onChange={(e) => setDraft({ ...draft, category: e.target.value as TaskStatusCategory })}>
            {Object.entries(STATUS_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
          </select>
          <button className="btn btn-sm btn-gold" disabled={busy || !draft.name.trim()}><Icon name="plus" size={13} />{t("Add status")}</button>
        </form>
      )}
      {removing && (
        <ConfirmDialog title={t("Remove step")} danger confirm={t("Remove")} busy={busy || (removing.taskCount > 0 && !moveTo)} onClose={() => setRemoving(null)}
          body={removing.taskCount > 0 ? (removing.taskCount === 1 ? t("{name} still has 1 task. Choose the step it moves to.", { name: removing.name }) : t("{name} still has {n} tasks. Choose the step they move to.", { name: removing.name, n: removing.taskCount })) : t("Remove the step {name}?", { name: removing.name })}
          onConfirm={() => run(() => onDelete(removing.id, moveTo || undefined), t("Step removed"), () => setRemoving(null))}>
          {removing.taskCount > 0 && (
            <label className="field" style={{ marginTop: 12 }}>{t("Move its tasks to:")}
              <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                <option value="">{t("Choose…")}</option>
                {ordered.filter((status) => status.id !== removing.id).map((status) => <option key={status.id} value={status.id}>{statusName(status.name, t)}</option>)}
              </select>
            </label>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

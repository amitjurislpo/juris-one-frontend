import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action";
import type { ProjectRow, TaskDetail as TaskDetailData, TaskLabel, TaskPage, TaskPriority, TaskType } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { PageLoading, useData } from "@/lib/page";
import { useRouter } from "@/lib/router";
import { useCurrentUser, useReadOnly } from "@/lib/session";
import { formatEstimate, mentionsToNames, namesToMentions, parseEstimate, statusName, TASK_PRIORITIES, TASK_REMINDER_CHOICES, TASK_TYPES } from "@/lib/tasks";
import { deleteTask, followTask, unfollowTask, updateTask, type TaskChanges } from "@/pages/tasks/actions";
import { AttachmentList } from "./AttachmentList";
import { ChecklistEditor } from "./ChecklistEditor";
import { CommentList } from "./CommentList";
import { DueInput } from "./DueInput";
import { DueLabel } from "./DueLabel";
import { LabelChips } from "./LabelChips";
import { MentionTextarea } from "./MentionTextarea";
import { PersonPicker } from "./PersonPicker";
import { PriorityLabel } from "./PriorityLabel";
import { RichText } from "./RichText";
import { StatusChip } from "./StatusChip";
import { SubtaskList } from "./SubtaskList";
import { TaskActivityList } from "./TaskActivityList";

type Save = (changes: Omit<TaskChanges, "version">) => Promise<boolean>;

/** The due box of the panel: a draft saved when focus leaves the box (or on Enter), so typing a date does not save every keystroke. */
function DueBox({ task, save }: { task: TaskDetailData; save: Save }) {
  const saved = { dueDate: task.dueDate ?? "", dueTime: task.dueTime ?? "", reminder: task.reminderBeforeMinutes ? String(task.reminderBeforeMinutes) : "" };
  const [draft, setDraft] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  // a fresh task (after any save or someone else's change) resets the draft
  if (lastSaved.dueDate !== saved.dueDate || lastSaved.dueTime !== saved.dueTime || lastSaved.reminder !== saved.reminder) {
    setLastSaved(saved);
    setDraft(saved);
  }
  const commit = (next = draft) => {
    if (next.dueDate === saved.dueDate && next.dueTime === saved.dueTime && next.reminder === saved.reminder) return;
    void save({
      dueDate: next.dueDate || null,
      dueTime: next.dueDate && next.dueTime ? next.dueTime : null,
      reminderBeforeMinutes: next.dueDate && next.reminder ? Number(next.reminder) : null,
    });
  };
  return (
    <div onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commit(); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}>
      <DueInput dueDate={draft.dueDate} dueTime={draft.dueTime} reminder={draft.reminder}
        onChange={(dueDate, dueTime) => setDraft({ ...draft, dueDate, dueTime, reminder: dueDate ? draft.reminder : "" })}
        onReminderChange={(reminder) => { const next = { ...draft, reminder }; setDraft(next); commit(next); }} />
      {task.isOverdue && <DueLabel task={task} />}
    </div>
  );
}

/** "Move to project": projects where the user can add tasks, or none (a personal task). */
function MoveToProjectDialog({ task, onClose, save }: { task: TaskDetailData; onClose: () => void; save: Save }) {
  const t = useT();
  const { user } = useCurrentUser();
  const projects = useData<TaskPage<ProjectRow>>("/api/projects?status=ACTIVE&sort=name");
  const [projectId, setProjectId] = useState("");
  const [busy, start] = useTransition();
  const isTaskAdmin = !!user?.perms.has("tasks.manage");
  const choices = (projects?.rows ?? []).filter((project) => project.id !== task.projectId && (isTaskAdmin || project.myRole === "OWNER" || project.myRole === "MEMBER"));
  return (
    <Modal title={t("Move to project")} eyebrow={task.key ?? t("Personal task")} size="sm" onClose={onClose} stacked
      footer={<><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn btn-gold" disabled={busy || (!projectId && !task.projectId)} onClick={() => start(async () => { if (await save({ projectId: projectId || null })) onClose(); })}>{t("Move")}</button></>}>
      <label className="field">{t("Project")}
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">{task.projectId ? t("No project (personal task)") : t("Choose…")}</option>
          {choices.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.name}</option>)}
        </select>
      </label>
      <p className="hint">{t("The task gets a new key in the project it moves to; its old link keeps working.")}</p>
    </Modal>
  );
}

/** Labels of the task: chips, ✕ to remove, a select to add one of the project's (or company) labels. */
function LabelField({ task, canEdit, save }: { task: TaskDetailData; canEdit: boolean; save: Save }) {
  const t = useT();
  const available = useData<TaskLabel[]>(canEdit ? `/api/task-labels${task.projectId ? `?projectId=${encodeURIComponent(task.projectId)}` : ""}` : null) ?? [];
  const ids = task.labels.map((label) => label.id);
  if (!canEdit) return task.labels.length ? <LabelChips labels={task.labels} /> : <span className="muted">—</span>;
  return (
    <span className="task-labels">
      {task.labels.map((label) => (
        <span key={label.id} className="chip nodot task-label neutral">
          {label.name}
          <button type="button" className="chip-x" aria-label={t("Remove label {name}", { name: label.name })} onClick={() => void save({ labelIds: ids.filter((id) => id !== label.id) })}><Icon name="x" size={11} /></button>
        </span>
      ))}
      {available.some((label) => !ids.includes(label.id)) && (
        <select className="task-label-add" value="" aria-label={t("Add a label")} onChange={(e) => { if (e.target.value) void save({ labelIds: [...ids, e.target.value] }); }}>
          <option value="">{t("+ Label")}</option>
          {available.filter((label) => !ids.includes(label.id)).map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}
        </select>
      )}
    </span>
  );
}

/** Title: plain text, or click to edit (Enter / leaving the box saves, Esc cancels). */
function TitleField({ task, canEdit, save }: { task: TaskDetailData; canEdit: boolean; save: Save }) {
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);
  if (!canEdit) return <h2 className="display task-title">{task.title}</h2>;
  if (draft === null) return <h2 className="display task-title"><button type="button" className="task-title-btn" aria-label={t("Edit title")} onClick={() => setDraft(task.title)}>{task.title}</button></h2>;
  const commit = () => { const next = draft.trim(); setDraft(null); if (next && next !== task.title) void save({ title: next }); };
  return <input className="task-title-input" aria-label={t("Title")} value={draft} maxLength={200} autoFocus onChange={(e) => setDraft(e.target.value)} onBlur={commit}
    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { e.stopPropagation(); setDraft(null); } }} />;
}

/** Description: the stored text with mentions, or an editor (Ctrl+Enter saves, Esc cancels). */
function DescriptionField({ task, canEdit, save }: { task: TaskDetailData; canEdit: boolean; save: Save }) {
  const t = useT();
  const [editing, setEditing] = useState<{ text: string; mentioned: { id: string; name: string }[] } | null>(null);
  const commit = async () => {
    if (!editing) return;
    const stored = namesToMentions(editing.text.trim(), editing.mentioned);
    if (stored === (task.description ?? "")) { setEditing(null); return; }
    if (await save({ description: stored || null })) setEditing(null);
  };
  return (
    <section className="task-section" aria-labelledby={`description-${task.id}`}>
      <div className="task-section-h">
        <h3 id={`description-${task.id}`}>{t("Description")}</h3>
        {canEdit && !editing && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(mentionsToNames(task.description ?? "", task.mentionedPeople))}><Icon name="edit" size={13} />{t("Edit")}</button>}
      </div>
      {editing ? (
        <div className="col" style={{ gap: 8 }} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setEditing(null); } }}>
          <MentionTextarea label={t("Description")} isLabelHidden value={editing.text} onChange={(text) => setEditing({ ...editing, text })} mentioned={editing.mentioned}
            onMentionedChange={(mentioned) => setEditing({ ...editing, mentioned })} projectId={task.projectId} rows={6} maxLength={20000} onSubmit={() => void commit()} autoFocus />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn btn-sm btn-gold" onClick={() => void commit()}>{t("Save")}</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>{t("Cancel")}</button>
          </div>
        </div>
      ) : task.description ? <RichText text={task.description} people={task.mentionedPeople} /> : <p className="muted">{t("No description.")}</p>}
    </section>
  );
}

/** Copy link · Move to project · Delete. */
function TaskMenu({ task, canMove, canDelete, onMove, onDelete }: { task: TaskDetailData; canMove: boolean; canDelete: boolean; onMove: () => void; onDelete: () => void }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    wrap.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const copy = () => {
    const link = `${window.location.origin}/tasks/${encodeURIComponent(task.key ?? task.id)}`;
    void navigator.clipboard?.writeText(link).then(() => toast(t("Link copied")), () => toast(link));
    setOpen(false);
  };
  return (
    <div className="task-move" ref={wrap} onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); } }}>
      <button type="button" className="icon-btn" aria-label={t("More actions")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" size={16} /></button>
      {open && (
        <div className="menu" role="menu">
          <button type="button" role="menuitem" onClick={copy}><Icon name="doc" size={15} />{t("Copy link")}</button>
          {canMove && <button type="button" role="menuitem" onClick={() => { setOpen(false); onMove(); }}><Icon name="folder" size={15} />{t("Move to project")}</button>}
          {canDelete && <button type="button" role="menuitem" className="danger" onClick={() => { setOpen(false); onDelete(); }}><Icon name="trash" size={15} />{t("Delete")}</button>}
        </div>
      )}
    </div>
  );
}

/**
 * Everything about one task; the same view on the task page and in the side panel. Each field saves on change with the
 * task's `version`; what the user may change follows the API's `permissions` field by field (and nothing while the
 * subscription has ended).
 */
export function TaskDetail({ taskRef, onClose }: { taskRef: string; /** set when shown in the side panel */ onClose?: () => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const readOnly = useReadOnly();
  const { user } = useCurrentUser();
  const task = useData<TaskDetailData>(`/api/tasks/${encodeURIComponent(taskRef)}`);
  const [saveError, setSaveError] = useState("");
  const [dialog, setDialog] = useState<"move" | "delete" | null>(null);
  const [tab, setTab] = useState<"comments" | "history">("comments");
  const [busy, start] = useTransition();
  if (!task || !user) return <PageLoading />;
  const timeZone = user.timeZone;
  const permissions = task.permissions;
  const can = (flag: boolean) => !readOnly && flag;
  const isDirectAssignee = task.assigneeId === user.id;

  const save: Save = async (changes) => {
    const result: ActionResult<{ version: number }> = await updateTask(task.id, { version: task.version, ...changes });
    if (result.ok) { setSaveError(""); return true; }
    setSaveError(result.error);
    return false;
  };
  const toggleFollow = () => start(async () => {
    const result = task.isWatching ? await unfollowTask(task.id, user.id) : await followTask(task.id, user.id);
    if (!result.ok) toast(result.error, "bad");
  });
  const assignee = task.assigneeId ? { id: task.assigneeId, name: task.assigneeName ?? "", photo: task.assigneePhoto } : null;
  const reminderLabel = TASK_REMINDER_CHOICES.find((choice) => choice.minutes === task.reminderBeforeMinutes)?.label;
  const accountable = task.indirectAssigneeId ? { id: task.indirectAssigneeId, name: task.indirectAssigneeName ?? "", photo: task.indirectAssigneePhoto } : null;

  return (
    <article className="task-detail" aria-labelledby={`task-title-${task.id}`}>
      <header className="task-detail-h">
        <div className="task-detail-where">
          <span className="eyebrow">
            {task.key ?? t("Personal task")}
            {task.projectId && <> · <Link href={`/projects/${encodeURIComponent(task.projectId)}`}>{task.projectName}</Link></>}
            {task.parentKey && <> · {t("Sub-task of")} <Link href={`/tasks/${encodeURIComponent(task.parentKey)}`}>{task.parentKey}</Link></>}
          </span>
        </div>
        <div className="task-detail-actions">
          {!readOnly && <button type="button" className="btn btn-sm" disabled={busy} aria-pressed={task.isWatching} onClick={toggleFollow}><Icon name={task.isWatching ? "eyeoff" : "eye"} size={14} />{task.isWatching ? t("Stop following") : t("Follow")}</button>}
          {onClose && <Link className="btn btn-sm btn-ghost" href={`/tasks/${encodeURIComponent(task.key ?? task.id)}`}>{t("Open full page")}</Link>}
          <TaskMenu task={task} canMove={can(permissions.canEdit)} canDelete={can(permissions.canDelete)} onMove={() => setDialog("move")} onDelete={() => setDialog("delete")} />
          {onClose && <button type="button" className="icon-btn" aria-label={t("Close")} onClick={onClose}><Icon name="x" size={16} /></button>}
        </div>
      </header>
      <div id={`task-title-${task.id}`}><TitleField key={task.version} task={task} canEdit={can(permissions.canEdit)} save={save} /></div>

      {saveError && (
        <div className="task-save-error" role="alert">
          <span>{saveError}</span>
          <button type="button" className="btn btn-sm" onClick={() => { setSaveError(""); router.refresh(); }}>{t("Reload")}</button>
        </div>
      )}

      <div className="task-fields">
        <label className="field">{t("Status")}
          {can(permissions.canChangeStatus)
            ? <select value={task.statusId} onChange={(e) => void save({ statusId: e.target.value })}>{task.statuses.map((status) => <option key={status.id} value={status.id}>{statusName(status.name, t)}</option>)}</select>
            : <span><StatusChip name={task.statusName} category={task.statusCategory} color={task.statusColor} /></span>}
        </label>
        <label className="field">{t("Priority")}
          {can(permissions.canChangePriority)
            ? <select value={task.priority} onChange={(e) => void save({ priority: e.target.value as TaskPriority })}>{Object.entries(TASK_PRIORITIES).map(([value, priority]) => <option key={value} value={value}>{t(priority.label)}</option>)}</select>
            : <span><PriorityLabel priority={task.priority} showNone /></span>}
        </label>
        <PersonPicker label={t("Assignee")} hint={t("does the work")} value={assignee} disabled={!can(permissions.canChangeDirectAssignee)} projectId={task.projectId} excludeId={task.indirectAssigneeId}
          onChange={(person) => void save({ assigneeId: person?.id ?? null })} />
        <PersonPicker label={t("Accountable")} hint={t("oversees it")} value={accountable} disabled={!can(permissions.canChangeIndirectAssignee)} projectId={task.projectId} excludeId={task.assigneeId}
          onChange={(person) => void save({ indirectAssigneeId: person?.id ?? null })} />
        <div className="field task-due-field">
          {can(permissions.canEdit) ? <DueBox task={task} save={save} /> : <>{t("Due date")}<span><DueLabel task={task} empty={t("No date")} />{reminderLabel && <> · {t("Remind me")}: {t(reminderLabel)}</>}</span></>}
        </div>
      </div>

      <div className="task-fields task-fields-more">
        <label className="field">{t("Start date")}
          {can(permissions.canEdit) ? <input type="date" value={task.startDate ?? ""} onChange={(e) => void save({ startDate: e.target.value || null })} /> : <span>{task.startDate ?? "—"}</span>}
        </label>
        <label className="field">{t("Type")}
          {can(permissions.canEdit)
            ? <select value={task.type} onChange={(e) => void save({ type: e.target.value as TaskType })}>{Object.entries(TASK_TYPES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select>
            : <span>{t(TASK_TYPES[task.type])}</span>}
        </label>
        <label className="field">{t("Estimate")}
          {can(permissions.canEdit) ? <input key={task.version} defaultValue={formatEstimate(task.estimateMinutes)} placeholder={t("e.g. 4h or 1h 30m")}
            onBlur={(e) => {
              const minutes = parseEstimate(e.target.value);
              if (Number.isNaN(minutes)) { setSaveError(t("Write the estimate like 4h, 1h 30m or 45m.")); return; }
              if (minutes !== task.estimateMinutes) void save({ estimateMinutes: minutes });
            }} /> : <span>{formatEstimate(task.estimateMinutes) || "—"}</span>}
        </label>
        <div className="field">{t("Labels")}<Suspense fallback={<span className="muted">…</span>}><LabelField task={task} canEdit={can(permissions.canEdit)} save={save} /></Suspense></div>
      </div>

      <div className="task-people-row">
        <span className="muted">{t("Reporter")}:</span> <b>{task.reporterName}</b>
        <span className="muted" style={{ marginLeft: 12 }}>{t("Followers")}:</span>
        <span className="task-watchers">
          {task.watchers.map((watcher) => <Avatar key={watcher.employeeId} id={watcher.employeeId} name={watcher.name} photo={watcher.photo} style={{ width: 24, height: 24, fontSize: 9.5 }} />)}
          {!task.watchers.length && <span className="muted">—</span>}
        </span>
      </div>

      <DescriptionField key={`description-${task.version}`} task={task} canEdit={can(permissions.canEdit)} save={save} />
      <SubtaskList task={task} canAdd={can(permissions.canEdit) && !task.parentTaskId} canTick={!readOnly} />
      <ChecklistEditor taskId={task.id} items={task.checklist} canEdit={can(permissions.canEdit || isDirectAssignee)} />
      <AttachmentList taskId={task.id} attachments={task.attachments} canAttach={can(permissions.canEdit || isDirectAssignee)} timeZone={timeZone} />

      <section className="task-section">
        <div className="seg" role="tablist" aria-label={t("Comments and history")}>
          <button type="button" role="tab" aria-selected={tab === "comments"} className={tab === "comments" ? "on" : undefined} onClick={() => setTab("comments")}>{t("Comments")}{task.commentCount ? ` (${task.commentCount})` : ""}</button>
          <button type="button" role="tab" aria-selected={tab === "history"} className={tab === "history" ? "on" : undefined} onClick={() => setTab("history")}>{t("History")}</button>
        </div>
        <div role="tabpanel" style={{ marginTop: 12 }}>
          <Suspense fallback={<PageLoading />}>
            {tab === "comments" ? <CommentList taskId={task.id} projectId={task.projectId} canComment={can(permissions.canComment)} timeZone={timeZone} /> : <TaskActivityList taskId={task.id} timeZone={timeZone} />}
          </Suspense>
        </div>
      </section>

      {dialog === "move" && <Suspense fallback={null}><MoveToProjectDialog task={task} save={save} onClose={() => setDialog(null)} /></Suspense>}
      {dialog === "delete" && (
        <ConfirmDialog title={t("Delete task")} danger confirm={t("Delete")} busy={busy} onClose={() => setDialog(null)}
          body={t("The task is removed from all lists. It is kept in the history and can be restored by a project owner.")}
          onConfirm={() => start(async () => {
            const result = await deleteTask(task.id);
            toast(result.ok ? result.message ?? t("Task deleted") : result.error, result.ok ? undefined : "bad");
            setDialog(null);
            if (result.ok) { if (onClose) onClose(); else router.push("/my-tasks"); }
          })} />
      )}
    </article>
  );
}

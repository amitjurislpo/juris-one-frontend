import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import type { ProjectDetail, TaskPriority, TaskType } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { namesToMentions, parseEstimate, statusName, TASK_PRIORITIES, TASK_TYPES } from "@/lib/tasks";
import { createTask } from "@/pages/tasks/actions";
import { DueInput } from "./DueInput";
import { MentionTextarea } from "./MentionTextarea";
import { PersonPicker, type PickedPerson } from "./PersonPicker";

/**
 * "New task" with every field. Inside a project (`project`) its steps and labels are offered; elsewhere a project can be
 * chosen from `projects` (or none: a personal task). After an assignee is chosen, their reporting manager is offered as
 * the accountable person with one click (never set by itself).
 */
export function TaskFormModal({ project, projects, statusId, onClose, onCreated }: {
  project?: ProjectDetail; projects?: { id: string; key: string; name: string }[]; statusId?: string;
  onClose: () => void; onCreated?: (task: { id: string; key: string | null }) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [projectId, setProjectId] = useState(project?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mentioned, setMentioned] = useState<{ id: string; name: string }[]>([]);
  const [type, setType] = useState<TaskType>("TASK");
  const [priority, setPriority] = useState<TaskPriority>("NONE");
  const [chosenStatusId, setChosenStatusId] = useState(statusId ?? project?.statuses.find((status) => status.isInitial)?.id ?? "");
  const [assignee, setAssignee] = useState<PickedPerson | null>(null);
  const [accountable, setAccountable] = useState<PickedPerson | null>(null);
  const [startDate, setStartDate] = useState("");
  const [due, setDue] = useState({ dueDate: "", dueTime: "" });
  const [estimate, setEstimate] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const managerId = assignee?.reportingManagerId;
  const isSuggestionShown = !!managerId && managerId !== assignee?.id && accountable?.id !== managerId;
  const save = () => start(async () => {
    if (!title.trim()) { setError(t("Enter a title.")); return; }
    const estimateMinutes = parseEstimate(estimate);
    if (Number.isNaN(estimateMinutes)) { setError(t("Write the estimate like 4h, 1h 30m or 45m.")); return; }
    const result = await createTask({
      projectId: projectId || null,
      title: title.trim(),
      description: description.trim() ? namesToMentions(description.trim(), mentioned) : null,
      type, priority,
      ...(projectId && chosenStatusId ? { statusId: chosenStatusId } : {}),
      assigneeId: assignee?.id ?? null,
      indirectAssigneeId: accountable?.id ?? null,
      startDate: startDate || null,
      dueDate: due.dueDate || null,
      dueTime: due.dueDate && due.dueTime ? due.dueTime : null,
      estimateMinutes,
      labelIds,
    });
    if (!result.ok) { setError(result.error); return; }
    toast(result.data?.key ? t("Task {key} created", { key: result.data.key }) : t("Task created"));
    onClose();
    if (result.data) onCreated?.(result.data);
  });

  return (
    <Modal title={t("New task")} eyebrow={project ? `${project.key} · ${project.name}` : t("Tasks")} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Create task")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        {!project && projects && (
          <label className="field">{t("Project")}
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{t("No project (personal task)")}</option>
              {projects.map((option) => <option key={option.id} value={option.id}>{option.key} · {option.name}</option>)}
            </select>
          </label>
        )}
        <label className="field">{t("Title *")}<input value={title} maxLength={200} autoFocus onChange={(e) => { setTitle(e.target.value); setError(""); }} /></label>
        <MentionTextarea label={t("Description")} value={description} onChange={setDescription} mentioned={mentioned} onMentionedChange={setMentioned} projectId={projectId || null} rows={3} maxLength={20000}
          placeholder={t("What needs to be done? Type @ to mention someone")} />
        <div className="grid2">
          <label className="field">{t("Type")}<select value={type} onChange={(e) => setType(e.target.value as TaskType)}>{Object.entries(TASK_TYPES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
          <label className="field">{t("Priority")}<select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{Object.entries(TASK_PRIORITIES).map(([value, option]) => <option key={value} value={value}>{t(option.label)}</option>)}</select></label>
          {project && (
            <label className="field">{t("Status")}<select value={chosenStatusId} onChange={(e) => setChosenStatusId(e.target.value)}>{project.statuses.map((status) => <option key={status.id} value={status.id}>{statusName(status.name, t)}</option>)}</select></label>
          )}
          <label className="field">{t("Start date")} <span className="hint">{t("optional")}</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        </div>
        <div className="grid2">
          <PersonPicker label={t("Assignee")} hint={t("does the work")} value={assignee} projectId={projectId || null} excludeId={accountable?.id} onChange={setAssignee} />
          <div className="col" style={{ gap: 6 }}>
            <PersonPicker label={t("Accountable")} hint={t("oversees it")} value={accountable} projectId={projectId || null} excludeId={assignee?.id} onChange={setAccountable} />
            {isSuggestionShown && (
              <button type="button" className="chip gold nodot task-suggestion" onClick={() => setAccountable({ id: managerId!, name: assignee?.reportingManagerName ?? t("Their reporting manager") })}>
                <Icon name="plus" size={12} />{assignee?.reportingManagerName ? t("Make {name} accountable", { name: assignee.reportingManagerName }) : t("Make their reporting manager accountable")}
              </button>
            )}
          </div>
        </div>
        <DueInput dueDate={due.dueDate} dueTime={due.dueTime} onChange={(dueDate, dueTime) => setDue({ dueDate, dueTime })} />
        <label className="field">{t("Estimate")} <span className="hint">{t("optional")}</span><input value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder={t("e.g. 4h or 1h 30m")} /></label>
        {project && project.labels.length > 0 && (
          <fieldset className="task-label-pick">
            <legend>{t("Labels")}</legend>
            {project.labels.map((label) => (
              <label key={label.id} className="task-label-option">
                <input type="checkbox" checked={labelIds.includes(label.id)} onChange={(e) => setLabelIds(e.target.checked ? [...labelIds, label.id] : labelIds.filter((id) => id !== label.id))} />{label.name}
              </label>
            ))}
          </fieldset>
        )}
        {error && <div className="err" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}

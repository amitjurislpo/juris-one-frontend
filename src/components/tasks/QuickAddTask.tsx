import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { createTask } from "@/pages/tasks/actions";

/**
 * Type a title, press Enter: the task is created (in the chosen project, or as a personal task; in `statusId` when
 * given, e.g. a board column). Details can be filled in afterwards. Added from My tasks (`projects` given) the task is assigned to you, so it
 * shows in the list you are looking at; added to a project's board it stays unassigned.
 */
export function QuickAddTask({ projects, projectId, statusId, label }: { projects?: { id: string; key: string; name: string }[]; projectId?: string; statusId?: string; label?: string }) {
  const t = useT();
  const { user } = usePage();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [chosenProjectId, setChosenProjectId] = useState("");
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const result = await createTask({ title: trimmed, projectId: projectId ?? (chosenProjectId || null), ...(statusId ? { statusId } : {}), ...(projects ? { assigneeId: user.id } : {}) });
    if (result.ok) { setTitle(""); toast(result.data?.key ? t("Task {key} created", { key: result.data.key }) : t("Task created")); }
    else toast(result.error, "bad");
  });
  const placeholder = label ?? t("Add a task… (Enter to save)");
  return (
    <form className="task-quick-add" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Icon name="plus" size={15} />
      <input value={title} maxLength={200} disabled={busy} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {projects && (
        <select value={chosenProjectId} onChange={(e) => setChosenProjectId(e.target.value)} aria-label={t("Project for the new task")}>
          <option value="">{t("Personal task")}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.name}</option>)}
        </select>
      )}
      <button className="btn btn-sm btn-gold" disabled={busy || !title.trim()}>{busy ? t("Saving…") : t("Add")}</button>
    </form>
  );
}

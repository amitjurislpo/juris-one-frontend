import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { ProjectDetail } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { TaskFormModal } from "./TaskFormModal";
import { useTaskDrawer } from "./useTaskDrawer";
import { useTaskShortcuts } from "./useTaskShortcuts";

/** "+ New task" (and the `n` shortcut): the full form; the new task opens in the side panel. Hidden while read-only. */
export function NewTaskButton({ project, projects }: { project?: ProjectDetail; projects?: { id: string; key: string; name: string }[] }) {
  const t = useT();
  const readOnly = useReadOnly();
  const [open, setOpen] = useState(false);
  const { openTask } = useTaskDrawer();
  useTaskShortcuts(readOnly ? null : () => setOpen(true));
  if (readOnly) return null;
  return (
    <>
      <button type="button" className="btn btn-gold btn-lg" onClick={() => setOpen(true)} aria-keyshortcuts="n"><Icon name="plus" size={16} />{t("New task")}</button>
      {open && <TaskFormModal project={project} projects={projects} onClose={() => setOpen(false)} onCreated={(task) => openTask(task.key ?? task.id)} />}
    </>
  );
}

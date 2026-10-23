import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import type { TaskRow } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { useReadOnly } from "@/lib/session";
import { groupByDue } from "@/lib/tasks";
import { changeTaskCategory } from "./changeTaskCategory";
import { DueLabel } from "./DueLabel";
import { LabelChips } from "./LabelChips";
import { PriorityLabel } from "./PriorityLabel";
import { StatusChip } from "./StatusChip";

/**
 * My tasks as a list grouped by due (Overdue, Today, This week, Later, No date). The checkbox finishes a task (or
 * opens it again); a row opens the task panel; tasks I am accountable for carry a chip and show who does the work.
 */
export function TaskGroupedList({ rows, today, onOpen }: { rows: TaskRow[]; today: string; onOpen: (task: TaskRow) => void }) {
  const t = useT();
  const toast = useToast();
  const readOnly = useReadOnly();
  const [saving, setSaving] = useState<string | null>(null);
  const toggle = async (task: TaskRow, isDone: boolean) => {
    setSaving(task.id);
    const result = await changeTaskCategory(task, isDone ? "DONE" : "TODO");
    setSaving(null);
    toast(result.ok ? (isDone ? t("Marked done") : t("Opened again")) : result.error, result.ok ? undefined : "bad");
  };
  return (
    <div className="task-groups">
      {groupByDue(rows, today).map((group) => (
        <section key={group.bucket} aria-labelledby={`bucket-${group.bucket}`}>
          <h3 className={`task-group-h${group.bucket === "OVERDUE" ? " task-overdue" : ""}`} id={`bucket-${group.bucket}`}>{t(group.label)} <span className="muted">({group.rows.length})</span></h3>
          <ul className="task-rows">
            {group.rows.map((task) => {
              const ref = task.key ?? task.id;
              const isDone = task.statusCategory === "DONE";
              return (
                <li key={task.id} className="task-row" tabIndex={0} onClick={(e) => { if (!(e.target as HTMLElement).closest("a, input, button")) onOpen(task); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onOpen(task); }}>
                  <input type="checkbox" checked={isDone} disabled={readOnly || saving === task.id} aria-label={isDone ? t("Open {title} again", { title: task.title }) : t("Mark {title} done", { title: task.title })}
                    onChange={(e) => void toggle(task, e.target.checked)} />
                  <div className="task-row-main">
                    <div className="task-row-line1">
                      <span className={isDone ? "task-done-text" : undefined}>{task.title}</span>
                      {task.myAssignment === "INDIRECT" && <span className="chip gold nodot task-accountable-chip">{t("Accountable")}</span>}
                    </div>
                    <div className="task-row-line2">
                      <Link href={`/tasks/${encodeURIComponent(ref)}`} className="task-key">{task.key ?? t("Personal")}</Link>
                      <StatusChip name={task.statusName} category={task.statusCategory} color={task.statusColor} />
                      <PriorityLabel priority={task.priority} />
                      <DueLabel task={task} />
                      {task.commentCount > 0 && <span className="task-count hide-sm"><Icon name="comment" size={12} />{task.commentCount}</span>}
                      <span className="hide-sm"><LabelChips labels={task.labels} /></span>
                    </div>
                  </div>
                  {task.myAssignment === "INDIRECT" && task.assigneeId && task.assigneeName && (
                    <span className="task-row-who" title={t("Done by {name}", { name: task.assigneeName })}>
                      <Avatar id={task.assigneeId} name={task.assigneeName} photo={task.assigneePhoto} style={{ width: 26, height: 26, fontSize: 10.5 }} />
                    </span>
                  )}
                  {task.projectKey && <span className="chip neutral nodot hide-sm">{task.projectKey}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

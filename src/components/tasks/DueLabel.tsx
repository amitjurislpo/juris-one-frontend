import type { TaskRow } from "@/lib/api-types";
import { todayIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useCurrentUser } from "@/lib/session";
import { formatDue } from "@/lib/tasks";

/** The due date (and time, with the zone when it is not the viewer's); red with the word "Overdue" when the server says so. */
export function DueLabel({ task, empty = "" }: { task: Pick<TaskRow, "dueDate" | "dueTime" | "dueTimeZone" | "isOverdue">; empty?: string }) {
  const t = useT();
  const timeZone = useCurrentUser().user?.timeZone ?? "Asia/Kolkata";
  if (!task.dueDate) return empty ? <span className="muted">{empty}</span> : null;
  const text = formatDue(task.dueDate, task.dueTime, task.dueTimeZone, timeZone, { today: todayIn(timeZone), t });
  return (
    <span className={`task-due${task.isOverdue ? " task-overdue" : ""}`}>
      {text}
      {task.isOverdue && <small className="task-overdue-word">{t("Overdue")}</small>}
    </span>
  );
}

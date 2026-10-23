import { Icon } from "@/components/Icon";
import type { TaskPriority } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { TASK_PRIORITIES } from "@/lib/tasks";

/** Flag + word ("High"); never colour alone. "No priority" is shown only when `showNone`. */
export function PriorityLabel({ priority, showNone }: { priority: TaskPriority; showNone?: boolean }) {
  const t = useT();
  if (priority === "NONE" && !showNone) return null;
  const { label, className } = TASK_PRIORITIES[priority];
  return <span className={`task-prio ${className}`}><Icon name="flag" size={12} />{t(label)}</span>;
}

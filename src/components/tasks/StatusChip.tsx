import type { TaskStatusCategory } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { colorTone, statusName } from "@/lib/tasks";

const CATEGORY_TONES: Record<TaskStatusCategory, string> = { TODO: "neutral", IN_PROGRESS: "info", DONE: "ok" };

/** A workflow step as a chip: its colour when it has one, else by category (To do grey, In progress blue, Done green). */
export function StatusChip({ name, category, color }: { name: string; category: TaskStatusCategory; color?: string | null }) {
  const t = useT();
  return <span className={`chip ${color ? colorTone(color) : CATEGORY_TONES[category]}`}>{statusName(name, t)}</span>;
}

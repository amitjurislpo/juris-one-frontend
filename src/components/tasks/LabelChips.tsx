import { colorTone } from "@/lib/tasks";

/** A task's labels as small chips in their palette colour. */
export function LabelChips({ labels }: { labels: { id: string; name: string; color: string | null }[] }) {
  if (!labels.length) return null;
  return (
    <span className="task-labels">
      {labels.map((label) => <span key={label.id} className={`chip nodot task-label ${colorTone(label.color)}`}>{label.name}</span>)}
    </span>
  );
}

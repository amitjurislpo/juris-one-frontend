import { useId } from "react";
import { useT } from "@/lib/i18n/client";

/**
 * Due date plus an optional due time (`HH:mm`). The time stays disabled until a date is chosen; clearing the date clears
 * the time. No time is pre-filled: without one the task is due at the end of that day.
 */
export function DueInput({ dueDate, dueTime, onChange, disabled }: { dueDate: string; dueTime: string; onChange: (dueDate: string, dueTime: string) => void; disabled?: boolean }) {
  const t = useT();
  const hintId = useId();
  return (
    <div className="due-input">
      <div className="due-input-row">
        <label className="field">{t("Due date")}
          <input type="date" value={dueDate} disabled={disabled} aria-describedby={hintId} onChange={(e) => onChange(e.target.value, e.target.value ? dueTime : "")} />
        </label>
        <label className="field">{t("Due time")} <span className="hint">{t("optional")}</span>
          <input type="time" value={dueTime} disabled={disabled || !dueDate} aria-describedby={hintId} onChange={(e) => onChange(dueDate, e.target.value)} />
        </label>
      </div>
      <span className="hint" id={hintId}>{t("Due times are in the assignee's time zone. Without a time the task is due at the end of the day.")}</span>
    </div>
  );
}

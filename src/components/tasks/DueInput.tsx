import { useId } from "react";
import { useT } from "@/lib/i18n/client";
import { TASK_REMINDER_CHOICES } from "@/lib/tasks";

/**
 * Due date plus an optional due time (`HH:mm`). The time stays disabled until a date is chosen; clearing the date clears
 * the time and the reminder. No time is pre-filled: without one the task is due at the end of that day. "Remind me" is the optional extra
 * reminder before the due moment (minutes as text, "" = none); it stays disabled until a date is chosen.
 */
export function DueInput({ dueDate, dueTime, reminder, onChange, onReminderChange, disabled }: {
  dueDate: string; dueTime: string; reminder: string;
  onChange: (dueDate: string, dueTime: string) => void; onReminderChange: (reminder: string) => void; disabled?: boolean;
}) {
  const t = useT();
  const hintId = useId();
  const reminderHintId = useId();
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
      <label className="field">{t("Remind me")} <span className="hint">{t("optional")}</span>
        <select value={dueDate ? reminder : ""} disabled={disabled || !dueDate} aria-describedby={reminderHintId} onChange={(e) => onReminderChange(e.target.value)}>
          <option value="">{t("No extra reminder")}</option>
          {TASK_REMINDER_CHOICES.map((choice) => <option key={choice.minutes} value={String(choice.minutes)}>{t(choice.label)}</option>)}
        </select>
      </label>
      {!dueDate && <span className="hint" id={reminderHintId}>{t("Choose a due date to set a reminder. It comes on top of the daily 09:00 reminders.")}</span>}
      <span className="hint" id={hintId}>{t("Due times are in the assignee's time zone. Without a time the task is due at the end of the day.")}</span>
    </div>
  );
}

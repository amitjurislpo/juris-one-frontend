import { formatDayMonth, formatHours } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { canRegularize, formatMinutes, type SummaryDay, useDayLabel } from "./attendanceViews";

const TIMELINE_HOURS = 12;

/** List view: one row per day with the check-in, a bar of the worked time, the check-out, late / early and the hours. */
export function AttendanceDayList({ days, onRegularize }: { days: SummaryDay[]; onRegularize: ((date: string) => void) | null }) {
  const t = useT();
  const dayLabel = useDayLabel();
  if (!days.length) return <p className="faint" style={{ padding: 24, margin: 0 }}>{t("No days match this filter.")}</p>;
  return (
    <ul className="att-list" aria-label={t("Attendance by day")}>
      {days.map((day) => (
        <li key={day.date} className={`att-row${day.today ? " today" : ""}`}>
          <div className="att-date"><b>{Number(day.date.slice(8))}</b><small>{t(day.weekday.slice(0, 3))}</small><small>{formatDayMonth(day.date)}</small></div>
          <div className="att-main">
            <b>{dayLabel(day) || "—"}</b>
            {(day.firstIn || day.lastOut) && (
              <div className="att-times">
                <span className="num">{day.firstIn ?? "—"}</span>
                <span className="att-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (day.hours / TIMELINE_HOURS) * 100)}%` }}></i></span>
                <span className="num">{day.lastOut ?? (day.live ? t("Working now") : "—")}</span>
              </div>
            )}
          </div>
          <div className="att-meta">
            {day.lateMinutes > 0 && <span className="chip warn">{t("Late by {time}", { time: formatMinutes(day.lateMinutes) })}</span>}
            {day.earlyMinutes > 0 && <span className="chip neutral">{t("Early by {time}", { time: formatMinutes(day.earlyMinutes) })}</span>}
            {day.regularizationStatus === "PENDING" && <span className="chip warn">{t("Regularization pending")}</span>}
            <b className="num">{day.hours > 0 ? formatHours(day.hours) : ""}</b>
            {onRegularize && canRegularize(day) && <button type="button" className="btn btn-sm btn-ghost" onClick={() => onRegularize(day.date)}>{t("Regularize")}</button>}
          </div>
        </li>
      ))}
    </ul>
  );
}

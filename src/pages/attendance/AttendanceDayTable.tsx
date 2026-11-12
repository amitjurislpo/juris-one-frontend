import { formatDayMonthYear, formatHours } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { canRegularize, formatMinutes, type SummaryDay, useDayLabel } from "./attendanceViews";

/** Tabular view: Date, Shift, Check-in, Check-out, Hours, Status, Late / Early. */
export function AttendanceDayTable({ days, onRegularize }: { days: SummaryDay[]; onRegularize: ((date: string) => void) | null }) {
  const t = useT();
  const dayLabel = useDayLabel();
  if (!days.length) return <p className="faint" style={{ padding: 24, margin: 0 }}>{t("No days match this filter.")}</p>;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th>{t("Date")}</th><th>{t("Shift")}</th><th>{t("Check-in")}</th><th>{t("Check-out")}</th><th>{t("Hours")}</th><th>{t("Status")}</th><th>{t("Late / early")}</th><th></th></tr></thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date} className={day.today ? "att-today" : undefined}>
              <td>{formatDayMonthYear(day.date)}</td>
              <td>{day.shiftName}</td>
              <td className="num">{day.firstIn ?? "—"}</td>
              <td className="num">{day.lastOut ?? "—"}{day.checkOutNote && <div className="faint" style={{ fontSize: 11.5, maxWidth: 240, overflowWrap: "anywhere" }} title={t("Check-out note")}>{day.checkOutNote}</div>}</td>
              <td className="num">{day.hours > 0 ? formatHours(day.hours) : "—"}</td>
              <td>{dayLabel(day) || "—"}{day.regularizationStatus === "PENDING" && <span className="chip warn" style={{ marginLeft: 8 }}>{t("Regularization pending")}</span>}</td>
              <td>{day.lateMinutes > 0 ? t("Late by {time}", { time: formatMinutes(day.lateMinutes) }) : day.earlyMinutes > 0 ? t("Early by {time}", { time: formatMinutes(day.earlyMinutes) }) : "—"}</td>
              <td>{onRegularize && canRegularize(day) && <button type="button" className="btn btn-sm btn-ghost" onClick={() => onRegularize(day.date)}>{t("Regularize")}</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

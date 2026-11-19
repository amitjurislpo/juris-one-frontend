import { MONTH_NAMES } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { formatClockMinutes, formatPercent, percentChange, previousMonthIndex } from "./attendanceInfo";

interface AverageSummary { avgWorkMinutes: number; avgActualMinutes: number; penaltyDays: number; previousAvgWorkMinutes: number | null; previousAvgActualMinutes: number | null }

/** Average work hours, average actual work hours (each with the change from last month) and penalty days, above the calendar. */
export function AttendanceAverageKpis({ summary, month }: { summary: AverageSummary; month: string }) {
  const t = useT();
  const previousMonth = t(MONTH_NAMES[previousMonthIndex(month)]);
  const change = (current: number, previous: number | null) => {
    const percent = percentChange(current, previous);
    if (percent === null) return null;
    return <span className="s" style={{ color: percent > 0 ? "var(--ok)" : percent < 0 ? "var(--bad)" : undefined }}>{t("{percent} from {month}", { percent: formatPercent(percent), month: previousMonth })}</span>;
  };
  return (
    <div className="kpis">
      <div className="card kpi enter" style={{ ["--i" as string]: 0 }}><span className="spot" aria-hidden="true"></span><span className="l">{t("Avg work hrs")}</span><span className="v num">{formatClockMinutes(summary.avgWorkMinutes)}</span>{change(summary.avgWorkMinutes, summary.previousAvgWorkMinutes)}</div>
      <div className="card kpi enter" style={{ ["--i" as string]: 1 }}><span className="spot" aria-hidden="true"></span><span className="l">{t("Avg actual work hrs")}</span><span className="v num">{formatClockMinutes(summary.avgActualMinutes)}</span>{change(summary.avgActualMinutes, summary.previousAvgActualMinutes)}</div>
      <div className="card kpi enter" style={{ ["--i" as string]: 2 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--bad)" }}></i> {t("Penalty days")}</span><span className="v num">{summary.penaltyDays}</span></div>
    </div>
  );
}

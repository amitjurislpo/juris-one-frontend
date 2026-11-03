import { useT } from "@/lib/i18n/client";
import { formatWeekdayDayMonthYear, MONTH_ABBREVIATIONS, MONTH_NAMES } from "@/lib/format";
import { AttendanceCalendar, type CalendarDay, type RegularizationView } from "./AttendanceClient";

/** GET /api/v1/attendance/mine: the month calendar with its day detail, the monthly numbers and the upcoming holidays. */
export interface MonthData {
  tracked: boolean;
  month: string;
  workDate: string;
  locked: boolean;
  selectedDate: string;
  summary: { present: number; absent: number; leave: number; holidays: number; weeklyOffs: number; workedMinutes: number; lateMarks: number; lateLopDays: number };
  days: CalendarDay[];
  regularizations: RegularizationView[];
  holidays: { id: string; date: string; name: string }[];
}

/** Calendar view: the month's numbers, the calendar (click a day to see it and ask for a regularization) and the upcoming holidays. */
export function AttendanceMonthView({ data }: { data: MonthData }) {
  const t = useT();
  const { month, locked, selectedDate, summary, days, regularizations, holidays } = data;
  return (
    <>
      <div className="kpis">
        <div className="card kpi enter" style={{ ["--i" as string]: 1 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--ok)" }}></i> {t("Present")}</span><span className="v num">{summary.present}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 2 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--bad)" }}></i> {t("Absent · loss of pay")}</span><span className="v num">{summary.absent}</span>{summary.lateMarks > 0 && <span className="s">{summary.lateMarks === 1 ? t("{n} late mark", { n: summary.lateMarks }) : t("{n} late marks", { n: summary.lateMarks })}{summary.lateLopDays ? ` · ${t("+{n} day LOP", { n: summary.lateLopDays })}` : ""}</span>}</div>
        <div className="card kpi enter" style={{ ["--i" as string]: 3 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--info)" }}></i> {t("On leave")}</span><span className="v num">{summary.leave}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 4 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--gold)" }}></i> {t("Holidays · weekly off")}</span><span className="v">{summary.holidays} · {summary.weeklyOffs}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 5 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--text)" }}></i> {t("Hours worked")}</span><span className="v num">{(summary.workedMinutes / 60).toFixed(1)}</span></div>
      </div>
      <AttendanceCalendar key={month} days={days} regs={regularizations} initialSel={selectedDate} locked={locked} monthLabel={`${t(MONTH_NAMES[Number(month.slice(5)) - 1])} ${month.slice(0, 4)}`} />
      <section className="card pad enter" style={{ ["--i" as string]: 8 }}>
        <span className="spot" aria-hidden="true"></span>
        <div className="card-h"><div><h3>{t("Upcoming holidays")}</h3><span className="faint" style={{ fontSize: 12.5 }}>{t("Official holidays for your team, set by HR")}</span></div></div>
        <div className="up-hol">
          {holidays.map((holiday, i) => (
            <div className="it" key={holiday.id} style={{ animationDelay: `${i * 50}ms` }}>
              <span className="hol-date"><b>{Number(holiday.date.slice(8))}</b><small>{MONTH_ABBREVIATIONS[Number(holiday.date.slice(5, 7)) - 1].toUpperCase()}</small></span>
              <div style={{ minWidth: 0 }}><b style={{ fontSize: 13.5, fontWeight: 600 }}>{holiday.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{formatWeekdayDayMonthYear(holiday.date)}</div></div>
            </div>
          ))}
          {!holidays.length && <div className="faint">{t("No more holidays this year.")}</div>}
        </div>
      </section>
    </>
  );
}

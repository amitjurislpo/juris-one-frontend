import Link from "@/lib/link";
import { Icon } from "@/components/Icon";
import { ComingInPhase, PageHeader } from "@/components/PageHeader";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { formatWeekdayDayMonthYear, MONTH_ABBREVIATIONS, MONTH_NAMES } from "@/lib/format";
import { AttendanceCalendar, type CalendarDay, type RegularizationView } from "./AttendanceClient";


const shiftYm = (ym: string, n: number) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);

export default function AttendancePage() {
  const { t, searchParams } = usePage();
  const data = useData<{
    tracked: boolean; month: string; minMonth: string; workDate: string; locked: boolean; selectedDate: string;
    summary: { present: number; absent: number; leave: number; holidays: number; weeklyOffs: number; workedMinutes: number; lateMarks: number; lateLopDays: number };
    days: CalendarDay[]; regularizations: RegularizationView[]; holidays: { id: string; date: string; name: string }[];
  }>(`/api/attendance/mine${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  if (!data.tracked) return <div className="col"><PageHeader eyebrow={t("Attendance")} title={t("My")} em={t("attendance")} /><ComingInPhase phase={2} t={t} what={t("Attendance isn't tracked for your account.")} /></div>;

  const { month, minMonth, workDate, locked, selectedDate, summary, days: calendarDays, regularizations, holidays } = data;
  const prev = shiftYm(month, -1), next = shiftYm(month, 1);

  return (
    <div className="col" style={{ gap: 24 }}>
      <PageHeader eyebrow={t("Attendance")} title={t(MONTH_NAMES[Number(month.slice(5)) - 1])} em={month.slice(0, 4)} sub={t("Tap any day to see its check-in, check-out and how it counts.")}>
        {prev >= minMonth ? <Link className="icon-btn" href={`/attendance?month=${prev}`} aria-label={t("Previous month")}><Icon n="chevL" /></Link> : <span className="icon-btn" aria-disabled="true" style={{ opacity: 0.4 }}><Icon n="chevL" /></span>}
        {next <= workDate.slice(0, 7) ? <Link className="icon-btn" href={`/attendance?month=${next}`} aria-label={t("Next month")}><Icon n="chevR" /></Link> : <span className="icon-btn" aria-disabled="true" style={{ opacity: 0.4 }}><Icon n="chevR" /></span>}
      </PageHeader>
      <div className="kpis">
        <div className="card kpi enter" style={{ ["--i" as string]: 1 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--ok)" }}></i> {t("Present")}</span><span className="v num">{summary.present}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 2 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--bad)" }}></i> {t("Absent · loss of pay")}</span><span className="v num">{summary.absent}</span>{summary.lateMarks > 0 && <span className="s">{summary.lateMarks === 1 ? t("{n} late mark", { n: summary.lateMarks }) : t("{n} late marks", { n: summary.lateMarks })}{summary.lateLopDays ? ` · ${t("+{n} day LOP", { n: summary.lateLopDays })}` : ""}</span>}</div>
        <div className="card kpi enter" style={{ ["--i" as string]: 3 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--info)" }}></i> {t("On leave")}</span><span className="v num">{summary.leave}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 4 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--gold)" }}></i> {t("Holidays · weekly off")}</span><span className="v">{summary.holidays} · {summary.weeklyOffs}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 5 }}><span className="spot" aria-hidden="true"></span><span className="l"><i className="dot" style={{ color: "var(--text)" }}></i> {t("Hours worked")}</span><span className="v num">{(summary.workedMinutes / 60).toFixed(1)}</span></div>
      </div>
      <AttendanceCalendar key={month} days={calendarDays} regs={regularizations} initialSel={selectedDate} locked={locked} monthLabel={`${t(MONTH_NAMES[Number(month.slice(5)) - 1])} ${month.slice(0, 4)}`} />
      <section className="card pad enter" style={{ ["--i" as string]: 8 }}>
        <span className="spot" aria-hidden="true"></span>
        <div className="card-h"><div><h3>{t("Upcoming holidays")}</h3><span className="faint" style={{ fontSize: 12.5 }}>{t("Official holidays for your team, set by HR")}</span></div></div>
        <div className="up-hol">
          {holidays.map((h, i) => (
            <div className="it" key={h.id} style={{ animationDelay: `${i * 50}ms` }}>
              <span className="hol-date"><b>{Number(h.date.slice(8))}</b><small>{MONTH_ABBREVIATIONS[Number(h.date.slice(5, 7)) - 1].toUpperCase()}</small></span>
              <div style={{ minWidth: 0 }}><b style={{ fontSize: 13.5, fontWeight: 600 }}>{h.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{formatWeekdayDayMonthYear(h.date)}</div></div>
            </div>
          ))}
          {!holidays.length && <div className="faint">{t("No more holidays this year.")}</div>}
        </div>
      </section>
    </div>
  );
}

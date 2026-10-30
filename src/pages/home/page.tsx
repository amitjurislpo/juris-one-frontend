import Link from "@/lib/link";
import { Greeting } from "@/components/home/Greeting";
import { HomeCards, type HomeCardsData } from "@/components/home/HomeCards";
import { AnnouncementsCard } from "@/components/home/AnnouncementsCard";
import { NotificationsCard } from "@/components/home/NotificationList";
import type { Announcement, InboxPage } from "@/lib/api-types";
import { HomeTrackTimer } from "@/components/home/HomeTrackTimer";
import { TimeCard } from "@/components/home/TimeCard";
import { Icon } from "@/components/Icon";
import { addDays, weekdayOf, type Status } from "@/lib/attendance/engine";
import { JURIS_TRACK } from "@/lib/nav";
import { PageLoading, useData, usePage } from "@/lib/page";
import { daysBetween, WEEKDAY_ABBREVIATIONS, formatDayMonth, formatWeekdayDayMonthYear, formatHours, MONTH_ABBREVIATIONS, MONTH_NAMES } from "@/lib/format";


type HomeDay = { date: string; status: Status; label: string; workedMinutes: number; future: boolean; punches: number };
type Home =
  | { tracked: false }
  | {
      tracked: true; workDate: string; checkedIn: boolean; openSince: string | null; closedMinutes: number; shiftText: string; ticks: string[]; targetHours: number;
      log: { time: string; label: string; detail: string }[]; days: HomeDay[]; leaveAvailable: number; holidays: { id: string; date: string; name: string; region: string }[]; cards: HomeCardsData;
    };

export default function HomePage() {
  const { user, t } = usePage();
  const home = useData<Home>("/api/v1/home");
  const box = useData<InboxPage>("/api/v1/notifications?limit=5");
  const news = useData<Announcement[]>("/api/v1/announcements?limit=3");
  if (!home || !box || !news) return <PageLoading />;
  const now = new Date();

  // Untracked (e.g. a custom role with `self` but no shift row) still gets the greeting.
  if (!home.tracked) return (
    <div className="col">
      <div className="page-h enter"><Greeting first={user.name.split(" ")[0]} timeZone={user.timeZone} initialIso={now.toISOString()} /></div>
      <AnnouncementsCard items={news} animationIndex={1} />
      <NotificationsCard items={box.items} unread={box.unread} timeZone={user.timeZone} animationIndex={2} />
    </div>
  );

  const { workDate, checkedIn, shiftText, ticks, log, days, leaveAvailable, holidays, cards } = home;
  const policy = { shiftTargetHours: home.targetHours };
  const closed = home.closedMinutes;
  const monday = addDays(workDate, -((weekdayOf(workDate) + 6) % 7));
  const heatStart = addDays(monday, -15 * 7);
  const monthStart = `${workDate.slice(0, 7)}-01`;
  const byDate = new Map(days.map((d) => [d.date, d]));

  // KPIs
  const month = days.filter((d) => d.date >= monthStart && d.date <= workDate);
  const working = month.filter((day) => !["HOLIDAY", "WEEKLY_OFF", "BEFORE_JOINING", "AFTER_EXIT", "NOT_TRACKED"].includes(day.status));
  const present = month.filter((day) => day.status === "PRESENT" || day.status === "HALF_DAY" || (day.date === workDate && day.punches > 0)).length;
  const lastShifts = days.filter((day) => day.date <= workDate && (day.workedMinutes > 0 || day.date === workDate) && !["HOLIDAY", "WEEKLY_OFF"].includes(day.status)).slice(-7);
  const finished = lastShifts.filter((d) => d.date !== workDate && d.workedMinutes > 0);
  const avgH = finished.length ? finished.reduce((a, d) => a + d.workedMinutes, 0) / finished.length / 60 : 0;
  const sparkVals = finished.map((d) => d.workedMinutes / 60);
  const spark = sparkVals.length > 1 ? (() => {
    const minimumHours = Math.min(...sparkVals) - 0.1, maximumHours = Math.max(...sparkVals) + 0.1;
    return sparkVals.map((hours, i) => `${i ? "L" : "M"}${((i / (sparkVals.length - 1)) * 120).toFixed(1)} ${(28 - ((hours - minimumHours) / (maximumHours - minimumHours)) * 24).toFixed(1)}`).join(" ");
  })() : "";
  const nextIn = holidays[0] ? daysBetween(workDate, holidays[0].date) : null;

  // heatmap: 16 weeks, Monday-first columns
  const heat = Array.from({ length: 112 }, (_, i) => {
    const date = addDays(heatStart, i);
    const dayRecord = byDate.get(date);
    if (!dayRecord || dayRecord.future || date > workDate) return { date, className: "na", title: formatWeekdayDayMonthYear(date) };
    let cellClass = "";
    if (dayRecord.status === "PRESENT" || dayRecord.status === "HALF_DAY" || (dayRecord.status === "PENDING" && dayRecord.punches)) {
      const workedHours = dayRecord.workedMinutes / 60;
      cellClass = workedHours < 8.8 ? "l1" : workedHours < 9.0 ? "l2" : workedHours < 9.2 ? "l3" : "l4";
      if (date === workDate) cellClass += " now";
    } else cellClass = { HOLIDAY: "hol", ABSENT: "abs", LEAVE: "lv", BEFORE_JOINING: "na", AFTER_EXIT: "na", NOT_TRACKED: "na", WEEKLY_OFF: "", PENDING: "" }[dayRecord.status] ?? "";
    return { date, className: cellClass, title: `${formatWeekdayDayMonthYear(date)} · ${dayRecord.workedMinutes ? formatHours(dayRecord.workedMinutes / 60) : dayRecord.label}` };
  });
  const heatPresent = heat.filter((c) => /l\d/.test(c.className)).length;

  // a business with JurisTrack has one clock, JurisTrack's (the API mirrors its start/end into attendance punches); read-only mode keeps the punch card, which has no buttons then
  const punchCard = <TimeCard checkedIn={checkedIn} openSince={home.openSince} closedMinutes={closed} shiftText={shiftText} ticks={ticks} targetHours={policy.shiftTargetHours} log={log} />;
  const timer = user.modules.includes(JURIS_TRACK) ? <HomeTrackTimer fallback={punchCard} /> : punchCard;

  return (
    <div className="col" style={{ gap: 20 }}>
      <div className="page-h enter">
        <Greeting first={user.name.split(" ")[0]} timeZone={user.timeZone} initialIso={now.toISOString()} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn" href="/attendance"><Icon name="clock" size={15} />{t("My attendance")}</Link>
          {!user.readOnly && <Link className="btn btn-gold" href="/leave?apply=1"><Icon name="plus" size={15} />{t("Apply leave")}</Link>}
        </div>
      </div>

      <div className="bento">
        {timer}

        <div className="span-5" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          <div className="card kpi lift enter" style={{ ["--i" as string]: 2 }}><span className="spot"></span><span className="ico" style={{ background: "var(--okbg)", color: "var(--ok)" }}><Icon name="check" size={16} /></span><span className="l">{t("Present in")} {MONTH_NAMES[Number(workDate.slice(5, 7)) - 1]}</span><span className="v"><span className="num">{present}</span><span className="faint" style={{ fontSize: 16, fontWeight: 500 }}> / {working.length}</span></span><span className="s">{t("working days so far")}</span></div>
          <div className="card kpi lift enter" style={{ ["--i" as string]: 3 }}><span className="spot"></span><span className="ico" style={{ background: "var(--accentsoft)", color: "var(--accent)" }}><Icon name="clock" size={16} /></span><span className="l">{t("Average day")}</span><span className="v"><span className="num">{avgH.toFixed(1)}</span>h</span>{spark && <svg className="spark" width="100%" height="30" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true"><path d={spark} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"></path></svg>}</div>
          <div className="card kpi lift enter" style={{ ["--i" as string]: 4 }}><span className="spot"></span><span className="ico" style={{ background: "var(--infobg)", color: "var(--info)" }}><Icon name="cal" size={16} /></span><span className="l">{t("Leave available")}</span><span className="v num">{leaveAvailable.toFixed(leaveAvailable % 1 ? 2 : 0)}</span><span className="s">{t("casual + earned days")}</span></div>
          <div className="card kpi lift enter" style={{ ["--i" as string]: 5 }}><span className="spot"></span><span className="ico" style={{ background: "var(--warnbg)", color: "var(--warn)" }}><Icon name="sparkle" size={16} /></span><span className="l">{t("Next holiday")}</span><span className="v">{nextIn === null ? "—" : <><span className="num">{nextIn}</span><span className="faint" style={{ fontSize: 16, fontWeight: 500 }}> {t("days")}</span></>}</span><span className="s">{holidays[0]?.name ?? t("No upcoming holidays")}</span></div>
        </div>

        <section className="card pad span-8 enter" style={{ ["--i" as string]: 6 }}>
          <span className="spot"></span>
          <div className="card-h">
            <div><h3>{t("Attendance activity")}</h3><span className="faint" style={{ fontSize: 12.5 }}>{t("Last 16 weeks")} · {heatPresent} {t("days present")}</span></div>
            <div className="legend">{t("Less")}<i style={{ background: "var(--heat0)" }}></i><i style={{ background: "var(--heat1)" }}></i><i style={{ background: "var(--heat2)" }}></i><i style={{ background: "var(--heat3)" }}></i><i style={{ background: "var(--heat4)" }}></i>{t("More")}</div>
          </div>
          <div className="heat-wrap">
            <div className="heat-days"><span>{t("Mon")}</span><span></span><span>{t("Wed")}</span><span></span><span>{t("Fri")}</span><span></span><span></span></div>
            <div className="heat" role="img" aria-label={t("Attendance heatmap, {days} days present in the last 16 weeks", { days: heatPresent })}>
              {heat.map((cell, i) => <i key={cell.date} className={cell.className} title={cell.title} style={{ animationDelay: `${i * 4}ms` }}></i>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14 }} className="legend">
            <span><i style={{ display: "inline-block", verticalAlign: "middle", boxShadow: "inset 0 0 0 1.5px var(--heat2)" }}></i> {t("Holiday")}</span>
            <span><i style={{ display: "inline-block", verticalAlign: "middle", background: "var(--badbg)", boxShadow: "inset 0 0 0 1.5px var(--bad)" }}></i> {t("Loss of pay")}</span>
            <span><i style={{ display: "inline-block", verticalAlign: "middle", background: "var(--infobg)", boxShadow: "inset 0 0 0 1.5px var(--info)" }}></i> {t("Leave")}</span>
            <span><i style={{ display: "inline-block", verticalAlign: "middle", boxShadow: "inset 0 0 0 1px var(--line3)" }}></i> {t("Before joining")}</span>
          </div>
        </section>

        <div className="span-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AnnouncementsCard items={news} animationIndex={7} />
          <NotificationsCard items={box.items} unread={box.unread} timeZone={user.timeZone} animationIndex={7} />
          <HomeCards cards={cards} firstCardIndex={7} />
        </div>

        <section className="card pad span-8 enter" style={{ ["--i" as string]: 8 }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("Last seven shifts")}</h3><span className="faint" style={{ fontSize: 12.5 }}>{t("dashed line = {hours}h target", { hours: policy.shiftTargetHours })}</span></div>
          <div className="bars">
            <div className="target" style={{ bottom: 140 }}></div>
            {lastShifts.map((shift, i) => {
              const workedHours = shift.workedMinutes / 60;
              return (
                <div className="b" key={shift.date} title={t("{hours} hours", { hours: workedHours.toFixed(1) })}>
                  <span className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>{workedHours.toFixed(1)}</span>
                  <i className={shift.date === workDate ? "today" : undefined} style={{ height: Math.max(6, (workedHours / policy.shiftTargetHours) * 140), animationDelay: `${0.25 + i * 0.06}s` }}></i>
                </div>
              );
            })}
          </div>
          <div className="bars-x">
            {lastShifts.map((shift) => <span key={shift.date}><b style={{ color: "var(--text)", fontWeight: 500 }}>{shift.date === workDate ? t("Today") : t(WEEKDAY_ABBREVIATIONS[weekdayOf(shift.date)])}</b><br />{formatDayMonth(shift.date)}</span>)}
          </div>
        </section>
        <section className="card pad span-4 enter" style={{ ["--i" as string]: 9 }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("Upcoming holidays")}</h3><Link className="btn btn-sm btn-ghost" href="/leave">{t("All")}</Link></div>
          <div className="list">
            {holidays.map((holiday) => (
              <div className="it" key={holiday.id}>
                <span className="hol-date"><b>{Number(holiday.date.slice(8))}</b><small>{MONTH_ABBREVIATIONS[Number(holiday.date.slice(5, 7)) - 1].toUpperCase()}</small></span>
                <div><b style={{ fontSize: 13.5, fontWeight: 600 }}>{holiday.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{formatWeekdayDayMonthYear(holiday.date)}</div></div>
              </div>
            ))}
            {!holidays.length && <div className="faint" style={{ fontSize: 13 }}>{t("No more holidays this year.")}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiData } from "@/lib/api";
import { formatDateTime, formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { formatClockMinutes, formatTimeOfDay, swipeSource, type DayDetail, type DaySwipe } from "./attendanceInfo";
import { SwipeInfoModal } from "./SwipeInfoModal";

/** The extra rows of the day detail card: shift, hours breakdown, remarks, sessions and swipes of one day (GET /api/v1/attendance/mine/day-details/{date}). */
export function AttendanceDayDetail({ date, isFuture }: { date: string; isFuture: boolean }) {
  const t = useT();
  const { user } = usePage();
  const [swipe, setSwipe] = useState<DaySwipe | null>(null);
  const path = `/api/v1/attendance/mine/day-details/${encodeURIComponent(date)}`;
  const query = useQuery({ queryKey: ["api", path], queryFn: () => apiData<DayDetail>(path), enabled: !isFuture });
  if (isFuture) return null;
  if (query.isPending) return <p className="faint" role="status" aria-busy="true" style={{ fontSize: 12.5, margin: "12px 0 0" }}>{t("Loading…")}</p>;
  if (query.isError || !query.data) return null;
  const detail = query.data;

  return (
    <div className="att-day-detail">
      <div>
        <div className="kv"><span className="muted">{t("Shift")}</span><b className="num">{detail.shiftName} · {detail.shiftStart} – {detail.shiftEnd}</b></div>
        <div className="kv"><span className="muted">{t("Processed on")}</span><b className="num">{detail.processedAt ? formatDateTime(new Date(detail.processedAt), user.timeZone) : "—"}</b></div>
        <div className="kv"><span className="muted">{t("Late in")}</span><b className="num">{formatClockMinutes(detail.lateMinutes)}</b></div>
        <div className="kv"><span className="muted">{t("Early out")}</span><b className="num">{formatClockMinutes(detail.earlyMinutes)}</b></div>
        <div className="kv"><span className="muted">{t("Total work hrs")}</span><b className="num">{formatClockMinutes(detail.totalMinutes)}</b></div>
        <div className="kv"><span className="muted">{t("Break hrs")}</span><b className="num">{formatClockMinutes(detail.breakMinutes)}</b></div>
        <div className="kv"><span className="muted">{t("Actual work hrs")}</span><b className="num">{formatClockMinutes(detail.actualMinutes)}</b></div>
        <div className="kv"><span className="muted">{t("Shortfall hrs")}</span><b className="num">{formatClockMinutes(detail.shortfallMinutes)}</b></div>
        <div className="kv"><span className="muted">{t("Excess hrs")}</span><b className="num">{formatClockMinutes(detail.excessMinutes)}</b></div>
        {detail.remarks && <div className="kv"><span className="muted">{t("Status details")}</span><b style={{ overflowWrap: "anywhere", textAlign: "right" }}>{detail.remarks}</b></div>}
      </div>

      <h3 className="att-day-subhead">{t("Session details")}</h3>
      {detail.sessions.length ? (
        <div className="table-wrap">
          <table className="t att-mini">
            <thead><tr><th>{t("Session")}</th><th>{t("Timing")}</th><th>{t("First in")}</th><th>{t("Last out")}</th></tr></thead>
            <tbody>
              {detail.sessions.map((session) => (
                <tr key={session.number}>
                  <td className="num">{session.number}</td>
                  <td className="num">{formatClockMinutes(session.minutes)}</td>
                  <td className="num">{formatTimeOfDay(session.startAt, user.timeZone, t)}</td>
                  <td className="num">{session.endAt ? formatTimeOfDay(session.endAt, user.timeZone, t) : t("Working now")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("No sessions on this day.")}</p>}

      <h3 className="att-day-subhead">{t("Swipes")}</h3>
      {detail.swipes.length ? (
        <div className="table-wrap">
          <table className="t att-mini">
            <thead><tr><th>{t("Time")}</th><th>{t("Date")}</th><th>{t("Source")}</th><th></th></tr></thead>
            <tbody>
              {detail.swipes.map((entry) => (
                <tr key={entry.id}>
                  <td className="num">{entry.time} <span className="faint">{entry.kind === "IN" ? t("In") : t("Out")}</span></td>
                  <td className="num">{formatDayMonthYear(entry.date)}</td>
                  <td>{swipeSource(entry, t)}</td>
                  <td><button type="button" className="btn btn-sm btn-ghost" onClick={() => setSwipe(entry)}>{t("Info")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("No swipes on this day.")}</p>}

      {swipe && <SwipeInfoModal swipe={swipe} employee={detail.employee} onClose={() => setSwipe(null)} />}
    </div>
  );
}

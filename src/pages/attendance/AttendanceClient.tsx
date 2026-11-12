
import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { weekdayOf } from "@/lib/attendance/engine";
import { formatWeekdayDayMonthYear, formatHours } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import type { T } from "@/lib/i18n/translate";
import { cancelRegularization } from "./actions";
import { KIND_LABEL, type RegularizationKind } from "./regularization";
import { RegularizationRequestModal } from "./RegularizationRequestModal";

export interface CalendarDay {
  date: string;
  status: string;
  label: string;
  late: boolean;
  lateWaived: boolean;
  hours: number;
  today: boolean;
  future: boolean;
  firstIn: string | null;
  lastOut: string | null;
  live: boolean;
  missedCheckout: boolean;
  offDayWork: boolean;
  lopDays: number;
  leaveDays: number;
  regularized: boolean;
  checkOutNote: string | null;
}

export interface RegularizationView { id: string; date: string; kind: string; status: string; decidedBy: string | null; reason: string | null }

const CLS: Record<string, string> = { PRESENT: "present", HALF_DAY: "present", ABSENT: "absent", HOLIDAY: "holiday", LEAVE: "leave", WEEKLY_OFF: "off" };
const CHIP: Record<string, string> = { PRESENT: "ok", HALF_DAY: "warn", ABSENT: "bad", HOLIDAY: "gold", LEAVE: "info" };
/** Short form of a leave day's label for the narrow calendar cell ("Casual leave · half day" → "CL · ½"); other labels are unchanged. */
const LEAVE_SHORT: Record<string, string> = { "Casual leave": "CL", "Earned leave": "EL", "Comp-off": "CO", "Leave without pay": "LWP" };
const shortLabel = (status: string, label: string) => {
  if (status !== "LEAVE") return label;
  const [name, rest] = label.split(" · ");
  const code = LEAVE_SHORT[name];
  return code ? (rest ? `${code} · ½` : code) : label;
};

function countsAs(day: CalendarDay, t: T) {
  if (day.future) return "—";
  switch (day.status) {
    case "PRESENT": return day.regularized ? t("Paid day (regularized)") : t("Paid day");
    case "HALF_DAY": return t("Half day · ½ loss of pay");
    case "ABSENT": return t("Loss of pay");
    case "HOLIDAY": return t("Paid holiday");
    case "WEEKLY_OFF": return t("Weekly off");
    case "LEAVE": return day.lopDays ? (day.leaveDays ? t("Leave {leave}d · LOP {lop}d", { leave: day.leaveDays, lop: day.lopDays }) : t("Unpaid leave")) : t("Paid leave");
    case "PENDING": return day.live ? t("Day in progress") : "—";
    default: return "—";
  }
}

function explain(day: CalendarDay, t: T) {
  if (day.label === "Remote") return t("An approved remote work day counts as a normal working day, with or without a check-in.");
  if (day.status === "ABSENT") return day.missedCheckout ? t("Check-out is missing, so the hours don't add up to a working day. Ask for a regularization with your real check-out time.") : t("No check-in and no leave applied. It stays loss of pay unless Admin or HR approves a regularization before payroll locks.");
  if (day.status === "HALF_DAY") return t("Between 4 and 8 hours worked, so half the day is loss of pay.");
  if (day.late) return t("Checked in after the grace period. Three late marks in a month count as half a day of loss of pay.");
  if (day.lateWaived) return t("A late check-in here was regularized — it doesn't count as a late mark.");
  if (day.offDayWork) return t("You worked on a day off. Request a comp-off to get a day back.");
  return t("Nothing to do for this day.");
}

export function AttendanceCalendar({ days, regs, initialSel, locked, monthLabel }: { days: CalendarDay[]; regs: RegularizationView[]; initialSel: string; locked: boolean; monthLabel: string }) {
  const toast = useToast();
  const t = useT();
  const readOnly = useReadOnly();
  const [sel, setSel] = useState(initialSel);
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const selectedDay = days.find((x) => x.date === sel) ?? days[0];
  const lead = (weekdayOf(days[0].date) + 6) % 7;
  const cells: (CalendarDay | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const dayRegs = regs.filter((r) => r.date === selectedDay.date);
  const pending = dayRegs.find((r) => r.status === "PENDING");
  const settled = dayRegs.find((r) => r.status === "APPROVED" || r.status === "DECLINED");

  const kinds: RegularizationKind[] = [];
  if (selectedDay.status === "ABSENT" || selectedDay.status === "HALF_DAY") kinds.push("ABSENT");
  if (selectedDay.missedCheckout) kinds.push("MISSED_CHECKOUT");
  if (selectedDay.late) kinds.push("LATE_CHECKIN");
  if (selectedDay.offDayWork) kinds.push("HOLIDAY_WORK");
  const canRequest = !readOnly && !locked && !selectedDay.future && !selectedDay.live && kinds.length > 0 && !pending;

  const openForm = () => setOpen(true);

  return (
    <>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <section className="card pad enter" style={{ ["--i" as string]: 6, flex: "2 1 600px", minWidth: 0 }} aria-label={t("Calendar, {month}", { month: monthLabel })}>
          <span className="spot" aria-hidden="true"></span>
          <div className="cal">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((weekday) => <span className="dow" key={weekday}>{t(weekday)}</span>)}
            {cells.map((cell, i) =>
              cell ? (
                <button key={cell.date} type="button" className={`d ${cell.future && cell.status !== "LEAVE" ? "none" : CLS[cell.status] ?? "none"}${sel === cell.date ? " sel" : ""}${cell.today ? " today" : ""}`} style={{ animationDelay: `${i * 12}ms` }}
                  onClick={() => setSel(cell.date)} aria-pressed={sel === cell.date} aria-label={`${formatWeekdayDayMonthYear(cell.date)}, ${cell.label ? t(cell.label) : t("no record")}${cell.late ? `, ${t("late")}` : ""}`}>
                  <span className="cal-top">
                    <b>{Number(cell.date.slice(8))}</b>
                    {cell.late && <span className="chip warn late-chip">{t("LATE")}</span>}
                  </span>
                  <small title={cell.status === "LEAVE" ? t(cell.label) : undefined}>{cell.future && cell.status !== "LEAVE" ? "" : cell.status === "LEAVE" ? shortLabel(cell.status, cell.label) : t(cell.label)}</small>
                  {cell.hours > 0 && <small className="num" style={{ color: "var(--text)" }}>{formatHours(cell.hours)}</small>}
                </button>
              ) : (
                <div key={`o${i}`} className="d out" style={{ animationDelay: `${i * 12}ms` }}></div>
              ),
            )}
          </div>
        </section>
        <section className="card pad enter" style={{ ["--i" as string]: 7, flex: "1 1 320px", position: "sticky", top: 96 }} aria-live="polite">
          <span className="spot" aria-hidden="true"></span>
          <span className="eyebrow">{t("Day detail")}</span>
          <h2 className="serif" style={{ fontSize: 30, margin: "10px 0 10px", fontWeight: 600 }}>{formatWeekdayDayMonthYear(selectedDay.date)}</h2>
          <span className={`chip ${CHIP[selectedDay.status] ?? "neutral"}`}>{selectedDay.future && selectedDay.status !== "LEAVE" ? t("Upcoming") : selectedDay.label ? t(selectedDay.label) : t("No record yet")}</span>
          <div style={{ marginTop: 16 }}>
            <div className="kv"><span className="muted">{t("First check-in")}</span><b className="num">{selectedDay.firstIn ?? "—"}</b></div>
            <div className="kv"><span className="muted">{t("Last check-out")}</span><b className="num">{selectedDay.lastOut ?? (selectedDay.live && selectedDay.firstIn ? t("Working now") : "—")}</b></div>
            {selectedDay.checkOutNote && <div className="kv"><span className="muted">{t("Check-out note")}</span><b style={{ overflowWrap: "anywhere", textAlign: "right" }}>{selectedDay.checkOutNote}</b></div>}
            <div className="kv"><span className="muted">{t("Worked")}</span><b className="num">{selectedDay.hours ? formatHours(selectedDay.hours) : "—"}</b></div>
            <div className="kv"><span className="muted">{t("Counts as")}</span><b>{countsAs(selectedDay, t)}</b></div>
          </div>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.65, margin: "14px 0" }}>{selectedDay.future ? t("This day hasn't happened yet.") : explain(selectedDay, t)}</p>
          {pending && (
            <div className="col" style={{ gap: 8 }}>
              <div className="chip warn" style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal" }}>{t("{kind} regularization pending — waiting for Admin or HR", { kind: t(KIND_LABEL[pending.kind]) })}</div>
              {!readOnly && <button className="btn btn-sm btn-ghost" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => start(async () => { const result = await cancelRegularization(pending.id); toast(result.ok ? result.message! : result.error, result.ok ? "ok" : "bad"); })}>{t("Withdraw request")}</button>}
            </div>
          )}
          {!pending && settled && (
            <div className={`chip ${settled.status === "APPROVED" ? "ok" : "bad"}`} style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal", marginBottom: 10 }}>
              {settled.status === "APPROVED"
                ? (settled.decidedBy ? t("{kind} regularization approved by {by}", { kind: t(KIND_LABEL[settled.kind]), by: settled.decidedBy }) : t("{kind} regularization approved", { kind: t(KIND_LABEL[settled.kind]) }))
                : (settled.decidedBy ? t("{kind} regularization declined by {by}", { kind: t(KIND_LABEL[settled.kind]), by: settled.decidedBy }) : t("{kind} regularization declined", { kind: t(KIND_LABEL[settled.kind]) }))}
            </div>
          )}
          {canRequest && <button className="btn btn-gold" style={{ width: "100%" }} onClick={openForm}>{t("Request regularization")}</button>}
          {locked && kinds.length > 0 && !selectedDay.future && <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("Attendance for this month is locked — Finance can adjust LOP in payroll.")}</p>}
        </section>
      </div>

      {open && <RegularizationRequestModal date={selectedDay.date} onClose={() => setOpen(false)} />}
    </>
  );
}

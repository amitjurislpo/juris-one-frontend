/**
 * Attendance engine — pure functions, no database (REQUIREMENTS §5.4).
 *
 * Every date here is a *work date* in the employee's own IANA zone. A night shift belongs to
 * the date it started on: punches are attributed to the shift whose window contains them, where
 * a window opens 4 hours before shift start and lasts 24 hours.
 */
import { TZDate } from "@date-fns/tz";

export type Status = "PRESENT" | "HALF_DAY" | "ABSENT" | "LEAVE" | "HOLIDAY" | "WEEKLY_OFF" | "BEFORE_JOINING" | "AFTER_EXIT" | "PENDING" | "NOT_TRACKED";

export interface ShiftDef {
  startLocal: string; // "19:30"
  endLocal: string; // "04:30"
  graceMinutes: number;
}

export interface Policy {
  fullDayHours: number;
  halfDayHours: number;
  weeklyOffs: number[]; // 0 = Sunday
  absenceJobBufferMinutes: number;
  lateMarksPerHalfDayLop: number;
}

export interface Punch {
  instant: Date;
  kind: "IN" | "OUT";
  source?: string;
}

export interface DayInput {
  date: string;
  now: Date;
  timeZone: string;
  shift: ShiftDef;
  policy: Policy;
  dateOfJoining: string;
  exitDate: string | null;
  trackingStart: string;
  holiday: string | null;
  /** Approved leave covering this date. */
  leave: { code: string; name: string; part: "FULL" | "FIRST_HALF" | "SECOND_HALF"; /** 1 = paid from balance, 0 = loss of pay */ paidFraction: number } | null;
  punches: Punch[]; // attributed to this work date, any order
  /** Approved regularizations for this date. */
  regularization: { absent: boolean; lateWaived: boolean };
}

export interface DayResult {
  date: string;
  status: Status;
  label: string;
  firstIn: Date | null;
  lastOut: Date | null;
  workedMinutes: number;
  /** Open check-in (no check-out yet). */
  openSince: Date | null;
  late: boolean;
  lateWaived: boolean;
  missedCheckout: boolean;
  regularized: boolean;
  lopDays: number;
  leaveDays: number;
  /** Day not finished yet (today, or future). */
  live: boolean;
  future: boolean;
  /** Worked on a holiday / weekly off (comp-off candidate). */
  offDayWork: boolean;
}

// ───────────────────────── time-zone helpers ─────────────────────────

const toMin = (timeOfDay: string) => {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  return hours * 60 + minutes;
};

// Building an Intl.DateTimeFormat is expensive; one per zone is reused for every conversion.
const FMT = new Map<string, Intl.DateTimeFormat>();
const fmtFor = (timeZone: string) => {
  let formatter = FMT.get(timeZone);
  if (!formatter) FMT.set(timeZone, (formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })));
  return formatter;
};

/** Local calendar date + minutes-after-midnight of an instant in `tz`. */
function localParts(instant: Date, timeZone: string): { date: string; minutes: number; dow: number } {
  const parts = Object.fromEntries(fmtFor(timeZone).formatToParts(instant).map((x) => [x.type, x.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute), dow: new Date(`${date}T00:00:00Z`).getUTCDay() };
}

export const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400_000).toISOString().slice(0, 10);
export const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** The instant of a local wall-clock time on `date` in `tz`. */
export function localDateTime(date: string, timeOfDay: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  return new Date(new TZDate(year, month - 1, day, hours, minutes, 0, timeZone).getTime());
}

const WINDOW_LEAD_MIN = 240;

/** Which work date a punch belongs to. */
export function workDateOf(instant: Date, shift: ShiftDef, timeZone: string): string {
  const { date, minutes } = localParts(instant, timeZone);
  const anchor = (toMin(shift.startLocal) - WINDOW_LEAD_MIN + 1440) % 1440;
  return minutes < anchor ? addDays(date, -1) : date;
}

/** Shift start, grace deadline and end for a work date (end rolls to the next day for night shifts). */
export function shiftWindow(date: string, shift: ShiftDef, timeZone: string) {
  const start = localDateTime(date, shift.startLocal, timeZone);
  const crosses = toMin(shift.endLocal) <= toMin(shift.startLocal);
  const end = localDateTime(crosses ? addDays(date, 1) : date, shift.endLocal, timeZone);
  return { start, graceUntil: new Date(start.getTime() + shift.graceMinutes * 60_000), end };
}

/** Sum of check-in → check-out pairs; an open check-in counts up to `liveUntil` if given. */
export function workedMinutes(punches: Punch[], liveUntil?: Date): { minutes: number; openSince: Date | null } {
  const sortedPunches = [...punches].sort((a, b) => a.instant.getTime() - b.instant.getTime());
  let milliseconds = 0;
  let open: Date | null = null;
  for (const punch of sortedPunches) {
    if (punch.kind === "IN") {
      if (!open) open = punch.instant;
    } else if (open) {
      milliseconds += punch.instant.getTime() - open.getTime();
      open = null;
    }
  }
  if (open && liveUntil && liveUntil > open) milliseconds += liveUntil.getTime() - open.getTime();
  return { minutes: Math.floor(milliseconds / 60_000), openSince: open };
}

// ───────────────────────── day status ─────────────────────────

/** Leave days vs LOP days for one date of leave (half-day parts count 0.5). */
function leaveSplit(leave: NonNullable<DayInput["leave"]>) {
  const unit = leave.part === "FULL" ? 1 : 0.5;
  const paid = Math.round(unit * Math.min(1, Math.max(0, leave.paidFraction)) * 100) / 100;
  return { leaveDays: paid, lopDays: Math.round((unit - paid) * 100) / 100 };
}

export function computeDay(input: DayInput): DayResult {
  const today = localParts(input.now, input.timeZone).date;
  const base: DayResult = {
    date: input.date, status: "PENDING", label: "", firstIn: null, lastOut: null, workedMinutes: 0, openSince: null,
    late: false, lateWaived: false, missedCheckout: false, regularized: false, lopDays: 0, leaveDays: 0,
    live: false, future: input.date > today, offDayWork: false,
  };
  if (input.date < input.trackingStart) return { ...base, status: "NOT_TRACKED", label: "Not tracked" };
  if (input.exitDate && input.date > input.exitDate) return { ...base, status: "AFTER_EXIT", label: "After exit" };
  if (input.date < input.dateOfJoining) return { ...base, status: "BEFORE_JOINING", label: "Before joining" };

  const win = shiftWindow(input.date, input.shift, input.timeZone);
  const dayOver = input.now.getTime() >= win.end.getTime() + input.policy.absenceJobBufferMinutes * 60_000;
  const sorted = [...input.punches].sort((a, b) => a.instant.getTime() - b.instant.getTime());
  const firstIn = sorted.find((p) => p.kind === "IN")?.instant ?? null;
  const lastOut = [...sorted].reverse().find((p) => p.kind === "OUT")?.instant ?? null;
  const worked = workedMinutes(sorted, dayOver ? undefined : input.now);
  const lastIsIn = sorted.at(-1)?.kind === "IN";
  const rawLate = !!firstIn && firstIn.getTime() > win.graceUntil.getTime();
  const punchFacts = {
    firstIn, lastOut, workedMinutes: worked.minutes, openSince: worked.openSince,
    late: rawLate && !input.regularization.lateWaived, lateWaived: rawLate && input.regularization.lateWaived,
    missedCheckout: lastIsIn && dayOver, live: !dayOver && !base.future,
  };

  // Off days: never leave or LOP; work on them is a comp-off candidate.
  const off = input.holiday ?? (input.policy.weeklyOffs.includes(weekdayOf(input.date)) ? "Weekly off" : null);
  if (off) {
    return { ...base, ...punchFacts, late: false, lateWaived: false, status: input.holiday ? "HOLIDAY" : "WEEKLY_OFF", label: off, offDayWork: worked.minutes >= input.policy.halfDayHours * 60 };
  }
  if (base.future) {
    if (input.leave) return { ...base, status: "LEAVE", label: input.leave.part === "FULL" ? input.leave.name : `${input.leave.name} · half day`, ...leaveSplit(input.leave) };
    return { ...base, status: "PENDING", label: "" };
  }

  const full = input.policy.fullDayHours * 60;
  const half = input.policy.halfDayHours * 60;

  if (input.leave?.part === "FULL") {
    return { ...base, ...punchFacts, late: false, status: "LEAVE", label: input.leave.name, ...leaveSplit(input.leave) };
  }

  // Half-day leave: the other half needs half-day hours.
  if (input.leave) {
    const short = dayOver && worked.minutes < half; // the working half wasn't worked
    const regularized = short && input.regularization.absent;
    return {
      ...base, ...punchFacts, status: "LEAVE", label: `${input.leave.name} · half day`, regularized,
      leaveDays: leaveSplit(input.leave).leaveDays,
      lopDays: leaveSplit(input.leave).lopDays + (short && !regularized ? 0.5 : 0),
    };
  }

  if (!sorted.length) {
    if (input.regularization.absent) return { ...base, status: "PRESENT", label: "Regularized", regularized: true, live: false };
    if (!dayOver) return { ...base, status: "PENDING", label: "Not checked in", live: true };
    return { ...base, status: "ABSENT", label: "Absent · LOP", lopDays: 1 };
  }

  if (!dayOver && (lastIsIn || worked.minutes < full)) {
    return { ...base, ...punchFacts, status: "PENDING", label: lastIsIn ? "In progress" : "Checked out" };
  }
  if (input.regularization.absent && worked.minutes < full) return { ...base, ...punchFacts, status: "PRESENT", label: "Regularized", regularized: true };
  if (worked.minutes >= full) return { ...base, ...punchFacts, status: "PRESENT", label: "Present" };
  if (worked.minutes >= half) return { ...base, ...punchFacts, status: "HALF_DAY", label: "Half day", lopDays: 0.5 };
  return { ...base, ...punchFacts, status: "ABSENT", label: punchFacts.missedCheckout ? "Missed check-out · LOP" : "Short day · LOP", lopDays: 1 };
}

// ───────────────────────── month summary ─────────────────────────

export interface MonthSummary {
  present: number; // half days count 0.5
  absent: number; // LOP days from attendance (absences + half days + unpaid leave)
  leave: number;
  holidays: number;
  weeklyOffs: number;
  workedMinutes: number;
  lateMarks: number;
  lateLopDays: number;
  lopDays: number; // absent + late-mark LOP
}

export function summarize(days: DayResult[], policy: Policy): MonthSummary {
  const summary: MonthSummary = { present: 0, absent: 0, leave: 0, holidays: 0, weeklyOffs: 0, workedMinutes: 0, lateMarks: 0, lateLopDays: 0, lopDays: 0 };
  for (const day of days) {
    if (day.status === "PRESENT") summary.present += 1;
    if (day.status === "HALF_DAY") summary.present += 0.5;
    if (day.status === "LEAVE" && day.workedMinutes >= policy.halfDayHours * 60) summary.present += 0.5;
    if (day.status === "HOLIDAY") summary.holidays += 1;
    if (day.status === "WEEKLY_OFF") summary.weeklyOffs += 1;
    summary.leave += day.leaveDays;
    summary.absent += day.lopDays;
    summary.workedMinutes += day.workedMinutes;
    if (day.late) summary.lateMarks += 1;
  }
  summary.lateLopDays = Math.floor(summary.lateMarks / policy.lateMarksPerHalfDayLop) * 0.5;
  summary.lopDays = summary.absent + summary.lateLopDays;
  return summary;
}

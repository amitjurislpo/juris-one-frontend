import type { PunchMode } from "@/lib/punch-mode";
import type { CalendarDay } from "./AttendanceClient";

/** Shapes and helpers of the Calendar view's extra numbers and of GET /api/v1/attendance/mine/day-details/{date}. */


interface DaySession { number: number; startAt: string; endAt: string | null; minutes: number }
export interface DaySwipe { id: string; at: string; time: string; date: string; kind: "IN" | "OUT"; source: string; location: string | null }

/** One day in full: shift, first in / last out, the work-hour breakdown, its sessions and the raw swipes. */
export interface DayDetail {
  date: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  processedAt: string | null;
  status: string;
  label: string;
  code: string;
  firstIn: string | null;
  lastOut: string | null;
  lateMinutes: number;
  earlyMinutes: number;
  totalMinutes: number;
  breakMinutes: number;
  actualMinutes: number;
  shortfallMinutes: number;
  excessMinutes: number;
  remarks: string | null;
  sessions: DaySession[];
  swipes: DaySwipe[];
  employee: { name: string; code: string; accessCardNumber: string | null };
  punchMode: PunchMode;
}

/** Minutes as HH:mm ("09:05"); a missing or negative value is "00:00". */
export function formatClockMinutes(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(minutes ?? 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Whole-number percent change from `previous` to `current`; null when there is nothing to compare with (no previous month, or it was 0). */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** "+4%" / "-3%" / "0%". */
export function formatPercent(percent: number): string {
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

/** Index (0-11) of the month before a "YYYY-MM" month. */
export function previousMonthIndex(month: string): number {
  return (Number(month.slice(5, 7)) + 10) % 12;
}

/** Which legend entries the month's days actually use, so the legend lists only what is on the calendar. */
export interface LegendUse {
  present: boolean; absent: boolean; offDay: boolean; leave: boolean; onDuty: boolean; holiday: boolean; halfDay: boolean;
  deductionAlert: boolean; deduction: boolean; grace: boolean;
}

export function legendUse(days: CalendarDay[]): LegendUse {
  const has = (test: (day: CalendarDay) => boolean) => days.some((day) => !day.future && test(day));
  const codeHas = (day: CalendarDay, code: string) => (day.code ?? "").split(":").includes(code);
  return {
    present: has((day) => codeHas(day, "P")),
    absent: has((day) => codeHas(day, "A")),
    offDay: has((day) => day.dayType === "WEEKLY_OFF"),
    leave: has((day) => codeHas(day, "L")),
    onDuty: has((day) => codeHas(day, "OD")),
    holiday: has((day) => day.dayType === "HOLIDAY"),
    halfDay: has((day) => day.dayType === "HALF_DAY"),
    deductionAlert: has((day) => day.deductionAlert === true),
    deduction: has((day) => day.lopDays > 0),
    grace: has((day) => day.graceUsed === true),
  };
}

/** Time of day of an instant in a zone, "9:05 am"; "—" when there is none. */
export function formatTimeOfDay(instant: string | null, timeZone: string, translate: (text: string) => string = (text) => text): string {
  if (!instant) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(new Date(instant)).map((part) => (part.type === "dayPeriod" ? translate(part.value.toUpperCase()) : part.value)).join("");
}

const SWIPE_SOURCE_LABEL: Record<string, string> = { WEB: "Web", MOBILE: "Mobile app", REGULARIZATION: "Regularization", JURISTRACK: "JurisTrack" };

/** Where a swipe came from, in words ("Web", "Web · Gate 2"). */
export function swipeSource(swipe: DaySwipe, translate: (text: string) => string): string {
  const source = translate(SWIPE_SOURCE_LABEL[swipe.source] ?? swipe.source);
  return swipe.location ? `${source} · ${swipe.location}` : source;
}

/** Shapes and small helpers of the Shift tab (the API is /api/v1/attendance/shifts, /shift-roster and /shift-assignments). */

import { isoToDate } from "@/lib/format";

export interface RosterShift {
  id: string;
  name: string;
  /** "HH:mm" in the employee's own zone. */
  startLocal: string;
  endLocal: string;
  graceMinutes: number;
  region: string;
  crossesMidnight: boolean;
  /** A shift of this business (editable); the platform's built-in shifts are not. */
  isCustom: boolean;
}

interface RosterDay {
  date: string;
  shiftId: string | null;
  /** Null when the shift is the employee's own (not placed on the roster). */
  assignmentId: string | null;
  isWeeklyOff: boolean;
}

export interface RosterEmployee {
  id: string;
  code: string;
  name: string;
  designation: string;
  days: RosterDay[];
}

export interface ShiftRoster {
  from: string;
  to: string;
  scope: "mine" | "all";
  canManage: boolean;
  shifts: RosterShift[];
  employees: RosterEmployee[];
}

export type RosterLayout = "weekly" | "monthly";

const toIso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (isoDate: string, days: number) => toIso(new Date(isoToDate(isoDate).getTime() + days * 86_400_000));

/** The days a layout shows around an anchor date: Monday to Sunday, or the calendar month. */
export function rosterPeriod(layout: RosterLayout, anchor: string): { from: string; to: string } {
  if (layout === "weekly") {
    const monday = addDays(anchor, -((isoToDate(anchor).getUTCDay() + 6) % 7));
    return { from: monday, to: addDays(monday, 6) };
  }
  const first = `${anchor.slice(0, 7)}-01`;
  const nextMonth = new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 1));
  return { from: first, to: addDays(toIso(nextMonth), -1) };
}

/** The anchor date of the previous (-1) or next (1) period. */
export function stepAnchor(layout: RosterLayout, anchor: string, direction: -1 | 1): string {
  if (layout === "weekly") return addDays(anchor, 7 * direction);
  return toIso(new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1 + direction, 1)));
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Where a shift's block sits on a 24 hour track (12 AM to 12 AM), in percent. A night shift runs to the end of its day; the rest shows on the next day. */
export function blockOnTrack(shift: RosterShift): { left: number; width: number } {
  const left = (minutesOf(shift.startLocal) / 1440) * 100;
  const end = shift.crossesMidnight ? 100 : (minutesOf(shift.endLocal) / 1440) * 100;
  return { left, width: Math.max(end - left, 1.5) };
}

/** The part of a night shift that falls after midnight, as a block from the start of the track, in percent of the day. */
export function spillOnTrack(shift: RosterShift): number {
  return shift.crossesMidnight ? (minutesOf(shift.endLocal) / 1440) * 100 : 0;
}

/** "19:30" → "7:30 PM". */
export function clockLabel(time: string): string {
  const hours = Number(time.slice(0, 2));
  return `${((hours + 11) % 12) + 1}:${time.slice(3, 5)} ${hours < 12 ? "AM" : "PM"}`;
}

export const shiftTimes = (shift: RosterShift) => `${clockLabel(shift.startLocal)} – ${clockLabel(shift.endLocal)}`;

/** Each shift gets one of five colours, in the order the API lists them. */
export const SHIFT_COLOUR_COUNT = 5;

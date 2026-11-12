/** Shapes and small helpers of the On Duty tab (the API is /api/v1/attendance/on-duty-requests…). */

export type OnDutyPart = "FULL" | "FIRST_HALF" | "SECOND_HALF";

/** English label of each duration (the key of the Hindi translation). */
export const PART_LABEL: Record<OnDutyPart, string> = { FULL: "Full day", FIRST_HALF: "First half", SECOND_HALF: "Second half" };

/** A range of days makes one request per day; the server refuses more than this. */
export const MAX_RANGE_DAYS = 31;
/** A duty can be planned this many days ahead. */
export const MAX_DAYS_AHEAD = 90;

export interface OnDutyItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  date: string;
  part: OnDutyPart;
  location: string | null;
  reason: string;
  status: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export interface OnDutyList { scope: "mine" | "all"; items: OnDutyItem[]; total: number; page: number; pageSize: number }

const DAY_MS = 86_400_000;

/** The number of calendar days from `from` to `to` (both included, `yyyy-MM-dd`); null when either is not a date. */
export function daysInRange(from: string, to: string): number | null {
  const first = Date.parse(`${from}T00:00:00Z`);
  const last = Date.parse(`${to}T00:00:00Z`);
  return Number.isNaN(first) || Number.isNaN(last) ? null : Math.round((last - first) / DAY_MS) + 1;
}

/**
 * What is wrong with the chosen days, as an English text for `t()` (the server checks the same rules again), or null when they are fine.
 * An empty `toDate` means a single day.
 */
export function rangeProblem(date: string, toDate: string): string | null {
  if (!date) return "Choose the date.";
  if (!toDate || toDate === date) return null;
  const days = daysInRange(date, toDate);
  if (days === null || days < 1) return "The last day can't be before the first day.";
  if (days > MAX_RANGE_DAYS) return "A range can cover at most 31 days.";
  return null;
}

/** The latest day a request can be made for, `yyyy-MM-dd`, given today. */
export function latestOnDutyDay(today: string): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) + MAX_DAYS_AHEAD * DAY_MS).toISOString().slice(0, 10);
}

/** "Full day", or "First half" / "Second half": the English label for a duration, falling back to the stored value. */
export const partLabel = (part: string) => PART_LABEL[part as OnDutyPart] ?? part;

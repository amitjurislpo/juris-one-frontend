import type { T } from "@/lib/i18n/translate";

/**
 * The API describes what approving a leave request does to the balance in English ("Balance 9 → 7", "Only 1 available — 1.00 day(s) become
 * loss of pay", "Unpaid leave"); this puts that sentence through the translation table, one pattern at a time.
 */
export function translateLeaveImpact(impact: string, t: T): string {
  const balance = /^Balance (\S+) → (\S+)$/.exec(impact);
  if (balance) return t("Balance {from} → {to}", { from: balance[1], to: balance[2] });
  const short = /^Only (\S+) available — (\S+) day\(s\) become loss of pay$/.exec(impact);
  if (short) return t("Only {available} available — {days} day(s) become loss of pay", { available: short[1], days: short[2] });
  return t(impact);
}

/** "Casual leave · 23 Nov" or "Late check-in · 13 Nov" as the API sends a decided request: the first part is a name that has a translation, the rest a date. */
export function translateDecidedRequest(what: string, t: T): string {
  const [name, ...rest] = what.split(" · ");
  return [t(name), ...rest].join(" · ");
}

/** The number on the Attendance tab of Approvals: regularizations plus the On Duty and Remote Work requests waiting for this approver. */
export function attendanceQueueCount(counts: { regularizationCount: number; onDutyCount: number; remoteWorkCount: number }): number {
  return counts.regularizationCount + counts.onDutyCount + counts.remoteWorkCount;
}

/** "Full day · Client site" (On Duty) or "Full day · 2 days" (Remote Work) as the API sends it: the day part and the day count are translated, a location is the employee's own text. */
export function translateAttendanceDetail(detail: string, t: T): string {
  const [part, ...rest] = detail.split(" · ");
  return [t(part), ...rest.map((text) => {
    const days = /^(\d+) days?$/.exec(text);
    return days ? (days[1] === "1" ? t("{n} day", { n: 1 }) : t("{n} days", { n: Number(days[1]) })) : text;
  })].join(" · ");
}

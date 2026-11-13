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

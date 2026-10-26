import type { T } from "./i18n/translate";

export const SHIFT_OPTIONS = {
  IN: [
    { value: "IN_NIGHT", label: "Night · 7:30 PM – 4:30 AM IST" },
    { value: "IN_DAY", label: "Day · 9:30 AM – 6:30 PM IST" },
  ],
  US: [{ value: "US_DAY", label: "Day · 9:00 AM – 6:00 PM local" }],
} as const;

/** The API prints a shift as "Night shift · 7:30 PM – 4:30 AM IST" (or "Day · 9:00 AM – 6:00 PM local"); this puts its words in the chosen language. */
export function shiftLabel(text: string, t: T): string {
  return text
    .replace(/^(Night|Day)\b( shift)?/, (_match, shiftName: string, suffix?: string) => (suffix ? t("{name} shift", { name: t(shiftName) }) : t(shiftName)))
    .replace(/\b(AM|PM)\b/g, (dayPart) => t(dayPart))
    .replace(/\blocal$/, () => t("local"));
}

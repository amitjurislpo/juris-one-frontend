/**
 * Formatting + calendar-date helpers shared by server and client.
 * Calendar dates travel as ISO strings ("2026-10-06"); `@db.Date` columns are UTC-midnight Dates.
 */
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTH_ABBREVIATIONS = MONTH_NAMES.map((monthName) => monthName.slice(0, 3));
export const WEEKDAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (value: number) => String(value).padStart(2, "0");

/** ISO date ("YYYY-MM-DD") of `instant` as seen in an IANA zone. */
export function isoInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

/** The calendar date of a UTC timestamp string as seen in `timeZone`. */
export const isoDateIn = (ts: string, timeZone: string) => isoInZone(new Date(ts), timeZone);

export const todayIn = (timeZone: string) => isoInZone(new Date(), timeZone);

/** ISO date string → Date (UTC midnight). */
export const isoToDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

const parts = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day, dow: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
};

export const formatDayMonth = (isoDate: string) => { const date = parts(isoDate); return `${date.day} ${MONTH_ABBREVIATIONS[date.month - 1]}`; };
export const formatDayMonthYear = (isoDate: string) => { const date = parts(isoDate); return `${date.day} ${MONTH_ABBREVIATIONS[date.month - 1]} ${date.year}`; };
export const formatWeekdayDayMonthYear = (isoDate: string) => { const date = parts(isoDate); return `${WEEKDAY_ABBREVIATIONS[date.dow]}, ${date.day} ${MONTH_ABBREVIATIONS[date.month - 1]} ${date.year}`; };
export const formatMonthLabel = (month: string) => { const [year, monthNumber] = month.split("-").map(Number); return `${MONTH_NAMES[monthNumber - 1]} ${year}`; };

export function formatDateTime(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(instant);
}

/** "21 Oct 2026, 8:15:42 pm" (seconds always shown) and the same with milliseconds for tooltips. */
export function formatDateTimeSeconds(instant: Date, timeZone: string, millis = false) {
  const formatted = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(instant);
  return millis ? formatted.replace(/(\d{2}) ?([ap]m)$/i, (_match, seconds: string, meridiem: string) => `${seconds}.${String(instant.getMilliseconds()).padStart(3, "0")} ${meridiem}`) : formatted;
}

/** Whole-day difference toDate − fromDate between two ISO dates. */
export function daysBetween(fromDate: string, toDate: string) {
  return Math.round((isoToDate(toDate).getTime() - isoToDate(fromDate).getTime()) / 86400_000);
}

/** Paise → "₹1,23,456" (Indian grouping). */
export const formatRupees = (paise: number | bigint | null | undefined) =>
  "₹" + Math.round(Number(paise ?? 0) / 100).toLocaleString("en-IN");

export const formatHours = (hours: number) => `${Math.floor(hours)}h ${pad(Math.round((hours % 1) * 60))}m`;

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 2).join("").toUpperCase();

const AVC = ["c0", "c1", "c2", "c3", "c4"];
export const avatarColorClass = (seed: string) => { let hash = 0; for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) % 997; return AVC[hash % 5]; };

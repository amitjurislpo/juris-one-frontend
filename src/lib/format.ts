/**
 * Formatting + calendar-date helpers shared by server and client.
 * Calendar dates travel as ISO strings ("2026-10-06"); `@db.Date` columns are UTC-midnight Dates.
 */
import { readLang } from "./i18n/lang";
import { hindiDayParts, hindiMonthAbbreviations } from "./i18n/messages/hi-notifications";
import { translate } from "./i18n/translate";

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

/** The zone the business runs in when the signed-in user's own zone is not known (the product is India-first). */
export const INDIA_TIME_ZONE = "Asia/Kolkata";

/** Today's calendar date in `timeZone` (never the browser's or UTC's date: between 00:00 and 05:30 IST they differ). `now` is for tests. */
export const todayIn = (timeZone: string, now: Date = new Date()) => isoInZone(now, timeZone);

export const todayInIndia = (now?: Date) => todayIn(INDIA_TIME_ZONE, now);

/** ISO date string → Date (UTC midnight). */
export const isoToDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

/** Month and weekday words in the chosen language (numerals stay Latin). */
const monthAbbreviation = (monthIndex: number) => { const abbreviation = MONTH_ABBREVIATIONS[monthIndex]; return readLang() === "hi" ? hindiMonthAbbreviations[abbreviation] ?? abbreviation : abbreviation; };
const weekdayAbbreviation = (weekdayIndex: number) => translate(readLang(), WEEKDAY_ABBREVIATIONS[weekdayIndex]);

const parts = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day, dow: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
};

export const formatDayMonth = (isoDate: string) => { const date = parts(isoDate); return `${date.day} ${monthAbbreviation(date.month - 1)}`; };
export const formatDayMonthYear = (isoDate: string) => { const date = parts(isoDate); return `${date.day} ${monthAbbreviation(date.month - 1)} ${date.year}`; };
export const formatWeekdayDayMonthYear = (isoDate: string) => { const date = parts(isoDate); return `${weekdayAbbreviation(date.dow)}, ${date.day} ${monthAbbreviation(date.month - 1)} ${date.year}`; };
export const formatMonthLabel = (month: string) => { const [year, monthNumber] = month.split("-").map(Number); return `${translate(readLang(), MONTH_NAMES[monthNumber - 1])} ${year}`; };

/** Month names and am/pm of a printed date-time in the chosen language. */
export const localizedDateTime = (text: string) => readLang() === "hi" ? text.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (month) => hindiMonthAbbreviations[month] ?? month).replace(/\b(am|pm)\b/gi, (dayPart) => hindiDayParts[dayPart.toLowerCase()] ?? dayPart) : text;

export function formatDateTime(instant: Date, timeZone: string) {
  return localizedDateTime(new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(instant));
}

/** "21 Oct 2026, 8:15:42 pm" (seconds always shown) and the same with milliseconds for tooltips. */
export function formatDateTimeSeconds(instant: Date, timeZone: string, millis = false) {
  const formatted = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(instant);
  return localizedDateTime(millis ? formatted.replace(/(\d{2}) ?([ap]m)$/i, (_match, seconds: string, meridiem: string) => `${seconds}.${String(instant.getMilliseconds()).padStart(3, "0")} ${meridiem}`) : formatted);
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

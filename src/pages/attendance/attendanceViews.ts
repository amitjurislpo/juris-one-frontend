import { useCallback } from "react";
import { useQuery } from "@/components/table/useQuery";
import { useT } from "@/lib/i18n/client";
import { DAY_STATUS_LABEL } from "./regularization";

/** Shapes of GET /api/v1/attendance/summary and the helpers the Attendance views share. */

export type AttendanceView = "list" | "tabular" | "calendar";
export const ATTENDANCE_VIEWS: AttendanceView[] = ["list", "tabular", "calendar"];

/** English labels of the toolbar filter (the key of the Hindi translation); the values are what the API accepts. */
export const STATUS_FILTER_LABEL: Record<string, string> = { PRESENT: "Present", ABSENT: "Absent", HALF_DAY: "Half day", LEAVE: "Leave", HOLIDAY: "Holiday", WEEKEND: "Weekend" };

export interface SummaryDay {
  date: string;
  weekday: string;
  status: string;
  label: string;
  shiftName: string;
  firstIn: string | null;
  lastOut: string | null;
  hours: number;
  lateMinutes: number;
  earlyMinutes: number;
  late: boolean;
  missedCheckout: boolean;
  today: boolean;
  future: boolean;
  live: boolean;
  regularized: boolean;
  regularizationStatus: string | null;
  checkOutNote: string | null;
}

export interface SummaryCounters {
  payableDays: number;
  present: number;
  onDuty: number;
  paidLeave: number;
  holidays: number;
  weekends: number;
  unpaidLeave: number;
  absent: number;
  lateCount: number;
  hours: Record<"payableDays" | "present" | "onDuty" | "paidLeave" | "holidays" | "weekends" | "unpaidLeave" | "absent", number>;
}

export interface AttendanceSummaryData {
  tracked: boolean;
  view: AttendanceView;
  from: string;
  to: string;
  previousFrom: string;
  nextFrom: string;
  workDate: string;
  shift: { name: string; start: string; end: string };
  counters: SummaryCounters;
  days: SummaryDay[];
  openSince: string | null; // ISO time of the check-in that is still open
}

const STORAGE_KEY = "attendance.view";

const isView = (value: string | null | undefined): value is AttendanceView => ATTENDANCE_VIEWS.includes(value as AttendanceView);

const readStored = (): AttendanceView | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isView(stored) ? stored : null;
  } catch {
    return null;
  }
};

/** List, Tabular or Calendar: the URL's `view=` wins, else the person's last choice in this browser, else List. */
export function useAttendanceView() {
  const { get, set } = useQuery();
  const fromUrl = get("view");
  const view: AttendanceView = isView(fromUrl) ? fromUrl : readStored() ?? "list";
  const setView = useCallback((next: AttendanceView) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private window: the URL still carries it */ }
    set({ view: next, from: null, status: null });
  }, [set]);
  return { view, setView };
}

/** Days with a trailing ".5" only when needed: 4, 0.5, 12.5. */
export const formatDays = (days: number) => String(Math.round(days * 100) / 100);

/** 75 minutes → "1h 15m". */
export const formatMinutes = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m` : `${minutes}m`);

/** A day the employee can ask to regularize: finished, no request waiting, and something to fix. */
export const canRegularize = (day: SummaryDay) =>
  !day.future && !day.live && day.regularizationStatus !== "PENDING" && (day.status === "ABSENT" || day.status === "HALF_DAY" || day.missedCheckout || day.late);

/** The words for a day's status in the List and Tabular views ("0.5 day Present, 0.5 day Absent" for a half day). */
export function useDayLabel() {
  const t = useT();
  return (day: SummaryDay) => {
    if (day.future && day.status !== "LEAVE") return "";
    if (day.status === "HALF_DAY") return t("0.5 day Present, 0.5 day Absent");
    return day.label ? t(day.label) : t(DAY_STATUS_LABEL[day.status] ?? day.status);
  };
}

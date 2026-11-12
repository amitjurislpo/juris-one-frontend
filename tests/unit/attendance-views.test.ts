import { describe, expect, it } from "vitest";
import { canRegularize, formatDays, formatMinutes, type SummaryDay } from "@/pages/attendance/attendanceViews";

const day = (overrides: Partial<SummaryDay>): SummaryDay => ({
  date: "2026-09-14", weekday: "MONDAY", status: "PRESENT", label: "Present", shiftName: "India Day", firstIn: "9:30 AM", lastOut: "6:30 PM", hours: 9,
  lateMinutes: 0, earlyMinutes: 0, late: false, missedCheckout: false, today: false, future: false, live: false, regularized: false, regularizationStatus: null, checkOutNote: null, ...overrides,
});

describe("attendance views helpers", () => {
  it("formats days and minutes", () => {
    expect(formatDays(4)).toBe("4");
    expect(formatDays(0.5)).toBe("0.5");
    expect(formatMinutes(20)).toBe("20m");
    expect(formatMinutes(75)).toBe("1h 15m");
  });
  it("offers Regularize only on a finished day that needs it and has no pending request", () => {
    expect(canRegularize(day({}))).toBe(false);
    expect(canRegularize(day({ status: "ABSENT" }))).toBe(true);
    expect(canRegularize(day({ status: "HALF_DAY" }))).toBe(true);
    expect(canRegularize(day({ missedCheckout: true }))).toBe(true);
    expect(canRegularize(day({ status: "ABSENT", regularizationStatus: "PENDING" }))).toBe(false);
    expect(canRegularize(day({ status: "ABSENT", future: true }))).toBe(false);
    expect(canRegularize(day({ status: "ABSENT", live: true }))).toBe(false);
  });
});

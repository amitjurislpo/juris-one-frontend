import { describe, expect, it } from "vitest";
import type { CalendarDay } from "@/pages/attendance/AttendanceClient";
import { formatClockMinutes, formatPercent, formatTimeOfDay, legendUse, percentChange, previousMonthIndex } from "@/pages/attendance/attendanceInfo";
import { toBusinessPunchMode } from "@/lib/punch-mode";

const day = (overrides: Partial<CalendarDay>): CalendarDay => ({
  date: "2026-11-10", status: "PRESENT", label: "Present", late: false, lateWaived: false, hours: 9, today: false, future: false, firstIn: null, lastOut: null, live: false,
  missedCheckout: false, offDayWork: false, lopDays: 0, leaveDays: 0, regularized: false, checkOutNote: null,
  code: "P", dayType: "WORKING", deductionAlert: false, graceUsed: false, sessionCount: 1, ...overrides,
});

describe("attendance info helpers", () => {
  it("formats minutes as HH:mm", () => {
    expect(formatClockMinutes(0)).toBe("00:00");
    expect(formatClockMinutes(545)).toBe("09:05");
    expect(formatClockMinutes(null)).toBe("00:00");
    expect(formatClockMinutes(-5)).toBe("00:00");
    expect(formatClockMinutes(6000)).toBe("100:00");
  });

  it("compares with the previous month in whole percent, or says nothing", () => {
    expect(percentChange(520, 500)).toBe(4);
    expect(percentChange(480, 500)).toBe(-4);
    expect(percentChange(500, 500)).toBe(0);
    expect(percentChange(500, null)).toBeNull();
    expect(percentChange(500, 0)).toBeNull();
    expect(formatPercent(4)).toBe("+4%");
    expect(formatPercent(-3)).toBe("-3%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("finds the month before a month, across the year end", () => {
    expect(previousMonthIndex("2026-11")).toBe(9);
    expect(previousMonthIndex("2026-01")).toBe(11);
  });

  it("lists only the legend entries the month uses", () => {
    const none = legendUse([day({ code: "P" })]);
    expect(none).toMatchObject({ present: true, absent: false, offDay: false, holiday: false, deductionAlert: false, grace: false });
    const used = legendUse([
      day({ code: "P:A", dayType: "HALF_DAY", lopDays: 0.5 }), day({ code: "O", dayType: "WEEKLY_OFF" }), day({ code: "H", dayType: "HOLIDAY" }),
      day({ code: "OD" }), day({ code: "L", dayType: "LEAVE" }), day({ code: "A", deductionAlert: true }), day({ graceUsed: true }),
    ]);
    expect(used).toEqual({ present: true, absent: true, offDay: true, leave: true, onDuty: true, holiday: true, halfDay: true, deductionAlert: true, deduction: true, grace: true });
  });

  it("ignores future days in the legend", () => {
    expect(legendUse([day({ code: "A", future: true })]).absent).toBe(false);
  });

  it("shows a time of day in a zone", () => {
    expect(formatTimeOfDay("2026-11-10T04:00:00Z", "Asia/Kolkata")).toMatch(/9:30\s?am/i);
    expect(formatTimeOfDay(null, "Asia/Kolkata")).toBe("—");
  });

  it("reads the business punch mode, falling back to manual", () => {
    expect(toBusinessPunchMode("MACHINE")).toBe("MACHINE");
    expect(toBusinessPunchMode("PER_EMPLOYEE")).toBe("PER_EMPLOYEE");
    expect(toBusinessPunchMode("nonsense")).toBe("MANUAL");
    expect(toBusinessPunchMode(undefined)).toBe("MANUAL");
  });
});

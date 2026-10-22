import { describe, expect, it } from "vitest";
import { localDateTime, computeDay, shiftWindow, summarize, workDateOf, workedMinutes, type DayInput, type Punch } from "@/lib/attendance/engine";

const IST = "Asia/Kolkata";
const NIGHT = { startLocal: "19:30", endLocal: "04:30", graceMinutes: 15 };
const DAY = { startLocal: "09:30", endLocal: "18:30", graceMinutes: 15 };
const US_SHIFT = { startLocal: "09:00", endLocal: "18:00", graceMinutes: 15 };
const POLICY = { fullDayHours: 8, halfDayHours: 4, weeklyOffs: [0, 6], absenceJobBufferMinutes: 120, lateMarksPerHalfDayLop: 3 };

const instantAt = (date: string, hm: string, tz = IST) => localDateTime(date, hm, tz);
const punchAt = (date: string, timeOfDay: string, kind: "IN" | "OUT", timeZone = IST): Punch => ({ instant: instantAt(date, timeOfDay, timeZone), kind });

function day(over: Partial<DayInput>): DayInput {
  return {
    date: "2026-09-16", now: instantAt("2026-10-06", "12:00"), timeZone: IST, shift: NIGHT, policy: POLICY, dateOfJoining: "2025-01-01", exitDate: null,
    trackingStart: "2026-04-01", holiday: null, leave: null, punches: [], regularization: { absent: false, lateWaived: false }, ...over,
  };
}

describe("night shift attribution", () => {
  it("assigns a 2 AM check-out to the shift that started the evening before", () => {
    expect(workDateOf(instantAt("2026-09-17", "02:00"), NIGHT, IST)).toBe("2026-09-16");
    expect(workDateOf(instantAt("2026-09-16", "19:25"), NIGHT, IST)).toBe("2026-09-16");
    expect(workDateOf(instantAt("2026-09-16", "15:29"), NIGHT, IST)).toBe("2026-09-15");
  });
  it("day shift: an early 6 AM check-in is the same day", () => {
    expect(workDateOf(instantAt("2026-09-16", "06:00"), DAY, IST)).toBe("2026-09-16");
  });
  it("night window ends the next morning", () => {
    const window = shiftWindow("2026-09-16", NIGHT, IST);
    expect(window.start.toISOString()).toBe("2026-09-16T14:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-16T23:00:00.000Z");
    expect(window.graceUntil.toISOString()).toBe("2026-09-16T14:15:00.000Z");
  });
});

describe("worked time", () => {
  it("sums multiple pairs", () => {
    const punches = [punchAt("2026-09-16", "19:30", "IN"), punchAt("2026-09-16", "23:30", "OUT"), punchAt("2026-09-17", "00:00", "IN"), punchAt("2026-09-17", "04:45", "OUT")];
    expect(workedMinutes(punches).minutes).toBe(4 * 60 + 4 * 60 + 45);
  });
  it("counts an open check-in up to now while live", () => {
    const worked = workedMinutes([punchAt("2026-10-06", "09:30", "IN")], instantAt("2026-10-06", "11:00"));
    expect(worked.minutes).toBe(90);
    expect(worked.openSince).not.toBeNull();
  });
});

describe("day status", () => {
  const full = [punchAt("2026-09-16", "19:31", "IN"), punchAt("2026-09-17", "04:40", "OUT")];
  it("present when 8h+ is worked", () => {
    const result = computeDay(day({ punches: full }));
    expect(result.status).toBe("PRESENT");
    expect(result.late).toBe(false);
    expect(result.lopDays).toBe(0);
  });
  it("late after the 15-minute grace", () => {
    const result = computeDay(day({ punches: [punchAt("2026-09-16", "19:46", "IN"), punchAt("2026-09-17", "04:50", "OUT")] }));
    expect(result.late).toBe(true);
    expect(computeDay(day({ punches: [punchAt("2026-09-16", "19:45", "IN"), punchAt("2026-09-17", "04:50", "OUT")] })).late).toBe(false);
  });
  it("a regularized late mark is waived", () => {
    const result = computeDay(day({ punches: [punchAt("2026-09-16", "20:10", "IN"), punchAt("2026-09-17", "05:00", "OUT")], regularization: { absent: false, lateWaived: true } }));
    expect(result.late).toBe(false);
    expect(result.lateWaived).toBe(true);
  });
  it("half day between 4h and 8h; absent below 4h", () => {
    expect(computeDay(day({ punches: [punchAt("2026-09-16", "19:30", "IN"), punchAt("2026-09-17", "01:00", "OUT")] }))).toMatchObject({ status: "HALF_DAY", lopDays: 0.5 });
    expect(computeDay(day({ punches: [punchAt("2026-09-16", "19:30", "IN"), punchAt("2026-09-16", "22:00", "OUT")] }))).toMatchObject({ status: "ABSENT", lopDays: 1 });
  });
  it("no check-in: pending until shift end + buffer, then absent (LOP)", () => {
    // night shift of 6 Oct ends 4:30 AM on 7 Oct; buffer 2h → 6:30 AM
    expect(computeDay(day({ date: "2026-10-06", now: instantAt("2026-10-07", "06:00") })).status).toBe("PENDING");
    expect(computeDay(day({ date: "2026-10-06", now: instantAt("2026-10-07", "06:31") }))).toMatchObject({ status: "ABSENT", lopDays: 1 });
  });
  it("an approved absence regularization makes the day paid", () => {
    expect(computeDay(day({ regularization: { absent: true, lateWaived: false } }))).toMatchObject({ status: "PRESENT", lopDays: 0, regularized: true });
  });
  it("missed check-out is flagged", () => {
    const result = computeDay(day({ punches: [punchAt("2026-09-16", "19:30", "IN")] }));
    expect(result.missedCheckout).toBe(true);
    expect(result.status).toBe("ABSENT");
  });
  it("in progress while checked in today", () => {
    const result = computeDay(day({ date: "2026-10-06", shift: DAY, now: instantAt("2026-10-06", "12:00"), punches: [punchAt("2026-10-06", "09:31", "IN")] }));
    expect(result).toMatchObject({ status: "PENDING", label: "In progress", live: true, workedMinutes: 149 });
  });
  it("holidays and weekly offs are never leave or LOP", () => {
    expect(computeDay(day({ date: "2026-10-02", holiday: "Gandhi Jayanti" }))).toMatchObject({ status: "HOLIDAY", lopDays: 0, leaveDays: 0 });
    expect(computeDay(day({ date: "2026-09-19" }))).toMatchObject({ status: "WEEKLY_OFF", lopDays: 0 });
  });
  it("holiday work of 4h+ is a comp-off candidate", () => {
    const result = computeDay(day({ date: "2026-10-02", holiday: "Gandhi Jayanti", punches: [punchAt("2026-10-02", "19:30", "IN"), punchAt("2026-10-03", "04:10", "OUT")] }));
    expect(result.offDayWork).toBe(true);
  });
  it("leave: paid full day, unpaid LOP leave, and half-day leave", () => {
    expect(computeDay(day({ leave: { code: "CL", name: "Casual leave", part: "FULL", paidFraction: 1 } }))).toMatchObject({ status: "LEAVE", leaveDays: 1, lopDays: 0 });
    expect(computeDay(day({ leave: { code: "LOP", name: "Leave without pay", part: "FULL", paidFraction: 0 } }))).toMatchObject({ status: "LEAVE", leaveDays: 0, lopDays: 1 });
    const half = { code: "CL", name: "Casual leave", part: "FIRST_HALF" as const, paidFraction: 1 };
    expect(computeDay(day({ leave: half, punches: [punchAt("2026-09-16", "23:30", "IN"), punchAt("2026-09-17", "04:00", "OUT")] }))).toMatchObject({ leaveDays: 0.5, lopDays: 0 });
    expect(computeDay(day({ leave: half }))).toMatchObject({ leaveDays: 0.5, lopDays: 0.5 });
    // balance ran short: half of the day is paid, half is LOP
    expect(computeDay(day({ leave: { code: "CL", name: "Casual leave", part: "FULL", paidFraction: 0.5 } }))).toMatchObject({ leaveDays: 0.5, lopDays: 0.5 });
  });
  it("before joining, after exit and before go-live", () => {
    expect(computeDay(day({ date: "2026-09-07", dateOfJoining: "2026-09-08" })).status).toBe("BEFORE_JOINING");
    expect(computeDay(day({ date: "2026-09-01", exitDate: "2026-08-31" })).status).toBe("AFTER_EXIT");
    expect(computeDay(day({ date: "2026-03-31" })).status).toBe("NOT_TRACKED");
  });
  it("future days are not judged", () => {
    expect(computeDay(day({ date: "2026-10-20" }))).toMatchObject({ status: "PENDING", future: true, lopDays: 0 });
  });
});

describe("US time zones", () => {
  it("uses the employee's local shift, including DST", () => {
    const NEW_YORK = "America/New_York";
    expect(shiftWindow("2026-09-16", US_SHIFT, NEW_YORK).start.toISOString()).toBe("2026-09-16T13:00:00.000Z"); // EDT
    expect(shiftWindow("2026-12-16", US_SHIFT, NEW_YORK).start.toISOString()).toBe("2026-12-16T14:00:00.000Z"); // EST
    const result = computeDay(day({ timeZone: NEW_YORK, shift: US_SHIFT, punches: [punchAt("2026-09-16", "09:20", "IN", NEW_YORK), punchAt("2026-09-16", "18:05", "OUT", NEW_YORK)] }));
    expect(result).toMatchObject({ status: "PRESENT", late: true });
  });
});

describe("month summary", () => {
  it("3 late marks = ½ day LOP", () => {
    const late = computeDay(day({ punches: [punchAt("2026-09-16", "20:00", "IN"), punchAt("2026-09-17", "05:00", "OUT")] }));
    const summary = summarize([late, late, late, late], POLICY);
    expect(summary.lateMarks).toBe(4);
    expect(summary.lateLopDays).toBe(0.5);
    expect(summary.lopDays).toBe(0.5);
    expect(summary.present).toBe(4);
  });
});

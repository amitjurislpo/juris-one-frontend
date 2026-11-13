import { describe, expect, it } from "vitest";
import { attendanceQueueCount, translateAttendanceDetail, translateDecidedRequest, translateLeaveImpact } from "@/pages/approvals/approvalText";
import type { T } from "@/lib/i18n/translate";

/** A stand-in translator that marks what it translated and fills the variables. */
const translate: T = (text, vars) => `[${text.replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name]))}]`;

describe("approval text", () => {
  it("translates the balance sentence with its numbers", () => {
    expect(translateLeaveImpact("Balance 9 → 7", translate)).toBe("[Balance 9 → 7]");
  });
  it("translates the loss-of-pay sentence", () => {
    expect(translateLeaveImpact("Only 1 available — 1.00 day(s) become loss of pay", translate)).toBe("[Only 1 available — 1.00 day(s) become loss of pay]");
  });
  it("translates a plain phrase as it is", () => {
    expect(translateLeaveImpact("Unpaid leave", translate)).toBe("[Unpaid leave]");
  });
  it("translates only the name of a decided request, not its date", () => {
    expect(translateDecidedRequest("Casual leave · 23 Nov", translate)).toBe("[Casual leave] · 23 Nov");
  });
  it("translates the day part and the day count of an attendance request, not the location", () => {
    expect(translateAttendanceDetail("Full day · Client site", translate)).toBe("[Full day] · Client site");
    expect(translateAttendanceDetail("Second half · 1 day", translate)).toBe("[Second half] · [1 day]");
    expect(translateAttendanceDetail("Full day · 3 days", translate)).toBe("[Full day] · [3 days]");
  });
  it("counts regularizations, On Duty and Remote Work requests in the Attendance tab", () => {
    expect(attendanceQueueCount({ regularizationCount: 2, onDutyCount: 1, remoteWorkCount: 3 })).toBe(6);
  });
});

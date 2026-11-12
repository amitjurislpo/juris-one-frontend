import { describe, expect, it } from "vitest";
import { hindiAttendanceMessages } from "@/lib/i18n/messages/hi-attendance";
import { translate } from "@/lib/i18n/translate";
import { ATTENDANCE_HELP } from "@/pages/attendance/AttendanceHelpModal";
import { withPendingCount } from "@/pages/attendance/pendingCounts";
import { toLocalInput } from "@/pages/attendance/regularization";
import { canEditRequest, onBehalfOf, REQUEST_LABEL, requestMenuKinds } from "@/pages/attendance/requestKinds";

describe("Request menu", () => {
  it("offers all three requests in an open month", () => {
    expect(requestMenuKinds({ isReadOnly: false, isMonthLocked: false })).toEqual(["regularization", "on-duty", "remote-work"]);
  });

  it("drops regularization when the viewed month is locked, but keeps On Duty and Remote Work", () => {
    expect(requestMenuKinds({ isReadOnly: false, isMonthLocked: true })).toEqual(["on-duty", "remote-work"]);
  });

  it("offers nothing in the read-only mode of an ended subscription", () => {
    expect(requestMenuKinds({ isReadOnly: true, isMonthLocked: false })).toEqual([]);
    expect(requestMenuKinds({ isReadOnly: true, isMonthLocked: true })).toEqual([]);
  });

  it("labels each request with a word that has a translation", () => {
    expect(Object.values(REQUEST_LABEL)).toEqual(["Regularization", "On Duty", "Remote Work"]);
    expect(hindiAttendanceMessages["Remote Work"]).toBeTruthy();
  });
});

describe("raising a request for an employee", () => {
  it("sends the employee id only when one is chosen", () => {
    expect(onBehalfOf("3f0c1d52-8d1c-4a1e-9a0b-6f3b2f2d1c11")).toEqual({ employeeId: "3f0c1d52-8d1c-4a1e-9a0b-6f3b2f2d1c11" });
    expect(onBehalfOf(undefined)).toEqual({});
    expect(onBehalfOf("")).toEqual({});
  });
});

describe("changing a pending request", () => {
  it("is offered only to the person who raised it, while pending and not read-only", () => {
    expect(canEditRequest({ status: "PENDING", createdBy: "u1" }, "u1", false)).toBe(true);
    expect(canEditRequest({ status: "PENDING", createdBy: "hr" }, "u1", false)).toBe(false); // raised by HR: the employee cannot
    expect(canEditRequest({ status: "APPROVED", createdBy: "u1" }, "u1", false)).toBe(false);
    expect(canEditRequest({ status: "PENDING", createdBy: null }, "u1", false)).toBe(false);
    expect(canEditRequest({ status: "PENDING", createdBy: "u1" }, "u1", true)).toBe(false);
  });

  it("turns a stored instant into the local value of a date-time input", () => {
    expect(toLocalInput("2026-10-05T14:05:00Z", "Asia/Kolkata")).toBe("2026-10-05T19:35");
    expect(toLocalInput("2026-10-05T23:30:00Z", "Asia/Kolkata")).toBe("2026-10-06T05:00");
    expect(toLocalInput(null, "Asia/Kolkata")).toBe("");
  });
});

describe("pending badges and help", () => {
  it("adds the count to a tab label only when something waits", () => {
    expect(withPendingCount("On Duty", 3)).toBe("On Duty · 3");
    expect(withPendingCount("On Duty", 0)).toBe("On Duty");
    expect(withPendingCount("On Duty", undefined)).toBe("On Duty");
  });

  it("has Hindi for every help title and text", () => {
    expect(ATTENDANCE_HELP.length).toBeGreaterThan(5);
    for (const section of ATTENDANCE_HELP) {
      expect(translate("hi", section.title), section.title).not.toBe(section.title);
      expect(translate("hi", section.text), section.text).not.toBe(section.text);
    }
  });
});

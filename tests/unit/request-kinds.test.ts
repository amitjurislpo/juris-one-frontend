import { describe, expect, it } from "vitest";
import { hindiAttendanceMessages } from "@/lib/i18n/messages/hi-attendance";
import { onBehalfOf, REQUEST_LABEL, requestMenuKinds } from "@/pages/attendance/requestKinds";

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

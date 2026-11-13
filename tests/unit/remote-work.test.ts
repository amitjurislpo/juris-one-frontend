import { describe, expect, it } from "vitest";
import { remoteWorkDays, remoteWorkDuration, remoteWorkProblem, type RemoteWorkItem } from "@/pages/attendance/remoteWork";
import { translate } from "@/lib/i18n/translate";

const item = (overrides: Partial<RemoteWorkItem> = {}): RemoteWorkItem => ({
  id: "r1", employeeId: "e1", employeeCode: "JC01", employeeName: "Asha Rao", department: null, fromDate: "2026-11-12", toDate: "2026-11-14", days: 3,
  reason: "Internet repair", status: "PENDING", decidedBy: null, decidedAt: null, decisionNote: null, createdAt: "2026-11-05T09:00:00Z", part: "FULL", createdBy: "e1", ...overrides,
});

describe("remote work request rules", () => {
  it("counts calendar days with both ends included", () => {
    expect(remoteWorkDays("2026-11-12", "2026-11-12")).toBe(1);
    expect(remoteWorkDays("2026-11-12", "2026-11-14")).toBe(3);
    expect(remoteWorkDays("2026-10-30", "2026-11-02")).toBe(4);
  });

  it("accepts a one-day request and a range of up to 31 days", () => {
    expect(remoteWorkProblem("2026-11-12", "2026-11-12", "Home")).toBeNull();
    expect(remoteWorkProblem("2026-11-01", "2026-12-01", "Home")).toBeNull();
  });

  it("names the first thing that is wrong", () => {
    expect(remoteWorkProblem("", "2026-11-12", "Home")).toBe("Choose the first and the last day.");
    expect(remoteWorkProblem("2026-11-12", "2026-11-11", "Home")).toBe("The last day can't be before the first day.");
    expect(remoteWorkProblem("2026-11-01", "2026-12-02", "Home")).toBe("A request can cover at most {days} days.");
    expect(remoteWorkProblem("2026-11-12", "2026-11-12", "   ")).toBe("Enter the reason for working remotely.");
    expect(remoteWorkProblem("2026-11-12", "2026-11-12", "r".repeat(501))).toBe("Keep the reason under 500 characters.");
  });

  it("has Hindi for every problem text", () => {
    for (const text of ["Choose the first and the last day.", "The last day can't be before the first day.", "A request can cover at most {days} days.", "Enter the reason for working remotely.", "Keep the reason under 500 characters."]) {
      expect(translate("hi", text, { days: 31 })).not.toBe(text);
    }
  });

  it("words the duration of a full-day range and of a half day", () => {
    expect(remoteWorkDuration(item({ days: 1 }))).toBe("1 day");
    expect(remoteWorkDuration(item())).toBe("{n} days");
    expect(remoteWorkDuration(item({ days: 1, part: "FIRST_HALF" }))).toBe("First half");
    expect(remoteWorkDuration(item({ days: 1, part: "SECOND_HALF" }))).toBe("Second half");
    for (const text of ["1 day", "First half", "Second half", "Half day"]) expect(translate("hi", text)).not.toBe(text);
  });
});

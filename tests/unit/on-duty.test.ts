import { describe, expect, it } from "vitest";
import { daysInRange, latestOnDutyDay, MAX_DAYS_AHEAD, MAX_RANGE_DAYS, partLabel, rangeProblem } from "@/pages/attendance/onDuty";

describe("On Duty helpers", () => {
  it("counts the calendar days of a range, both ends included", () => {
    expect(daysInRange("2026-10-05", "2026-10-05")).toBe(1);
    expect(daysInRange("2026-10-05", "2026-10-09")).toBe(5);
    expect(daysInRange("2026-10-30", "2026-11-02")).toBe(4);
    expect(daysInRange("2026-10-09", "2026-10-05")).toBe(-3);
    expect(daysInRange("", "2026-10-05")).toBeNull();
    expect(daysInRange("not a date", "2026-10-05")).toBeNull();
  });

  it("accepts one day, an empty last day and a sensible range", () => {
    expect(rangeProblem("2026-10-05", "")).toBeNull();
    expect(rangeProblem("2026-10-05", "2026-10-05")).toBeNull();
    expect(rangeProblem("2026-10-05", "2026-10-09")).toBeNull();
    expect(rangeProblem("2026-10-01", `2026-10-${MAX_RANGE_DAYS}`)).toBeNull();
  });

  it("refuses a missing date, a last day before the first and a range longer than a month", () => {
    expect(rangeProblem("", "")).toBe("Choose the date.");
    expect(rangeProblem("2026-10-05", "2026-10-04")).toBe("The last day can't be before the first day.");
    expect(rangeProblem("2026-10-01", "2026-11-01")).toBe("A range can cover at most 31 days.");
    expect(rangeProblem("2026-10-05", "soon")).toBe("The last day can't be before the first day.");
  });

  it("works out the latest day a duty can be planned for", () => {
    expect(latestOnDutyDay("2026-10-05")).toBe("2027-01-03");
    expect(MAX_DAYS_AHEAD).toBe(90);
  });

  it("labels the duration and falls back to the stored value", () => {
    expect(partLabel("FULL")).toBe("Full day");
    expect(partLabel("FIRST_HALF")).toBe("First half");
    expect(partLabel("SECOND_HALF")).toBe("Second half");
    expect(partLabel("SOMETHING_ELSE")).toBe("SOMETHING_ELSE");
  });
});

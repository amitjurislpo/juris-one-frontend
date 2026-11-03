import { describe, expect, it } from "vitest";
import { formatMinutes, minutesBetweenLocal, prefillUnlessTouched } from "@/pages/attendance/regularization";

describe("regularization helpers", () => {
  it("formats minutes as H:mm", () => {
    expect(formatMinutes(570)).toBe("9:30");
    expect(formatMinutes(65)).toBe("1:05");
    expect(formatMinutes(null)).toBe("—");
  });

  it("works out the total hours of a day, also across midnight", () => {
    expect(minutesBetweenLocal("2026-10-05T09:30", "2026-10-05T18:45")).toBe(555);
    expect(minutesBetweenLocal("2026-10-05T22:00", "2026-10-06T06:00")).toBe(480);
  });

  it("gives nothing until both times are there and in order", () => {
    expect(minutesBetweenLocal("", "2026-10-05T18:45")).toBeNull();
    expect(minutesBetweenLocal("2026-10-05T18:45", "2026-10-05T09:30")).toBeNull();
  });

  it("prefills from the server only the fields the user has not typed in", () => {
    expect(prefillUnlessTouched("", "2026-10-05T09:30", false)).toBe("2026-10-05T09:30");
    expect(prefillUnlessTouched("2026-10-05T10:00", "2026-10-05T09:30", true)).toBe("2026-10-05T10:00");
    expect(prefillUnlessTouched("", "", true)).toBe("");
  });
});

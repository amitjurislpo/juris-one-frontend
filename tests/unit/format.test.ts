import { describe, expect, it } from "vitest";
import { daysBetween, formatWeekdayDayMonthYear, formatRupees, isoDateIn, isoInZone, todayIn, todayInIndia } from "@/lib/format";

describe("formatting", () => {
  it("formats paise as Indian rupees", () => {
    expect(formatRupees(1492600)).toBe("₹14,926");
    expect(formatRupees(BigInt(75000000))).toBe("₹7,50,000");
  });

  it("formats ISO dates without time-zone drift", () => {
    expect(formatWeekdayDayMonthYear("2026-10-06")).toBe("Tue, 6 Oct 2026");
    expect(daysBetween("2026-10-06", "2026-10-20")).toBe(14);
  });

  it("resolves the calendar date in the employee's zone", () => {
    const instant = new Date("2026-10-06T20:00:00Z"); // 01:30 IST next day, 16:00 ET
    expect(isoInZone(instant, "Asia/Kolkata")).toBe("2026-10-07");
    expect(isoInZone(instant, "America/New_York")).toBe("2026-10-06");
  });

  it("gives today's date in India, not the UTC date, just after midnight IST", () => {
    const justAfterMidnightIst = new Date("2026-10-26T20:30:00Z"); // 02:00 IST on 27 Oct
    expect(justAfterMidnightIst.toISOString().slice(0, 10)).toBe("2026-10-26");
    expect(todayInIndia(justAfterMidnightIst)).toBe("2026-10-27");
    expect(todayIn("Asia/Kolkata", new Date("2026-10-26T18:29:59Z"))).toBe("2026-10-26");
    expect(todayIn("Asia/Kolkata", new Date("2026-10-26T18:30:00Z"))).toBe("2026-10-27");
    expect(todayIn("America/New_York", justAfterMidnightIst)).toBe("2026-10-26");
  });

  it("gives the calendar date of a stored timestamp in the business zone", () => {
    expect(isoDateIn("2026-10-26T19:00:00Z", "Asia/Kolkata")).toBe("2026-10-27");
    expect(isoDateIn("2026-10-26T19:00:00Z", "UTC")).toBe("2026-10-26");
  });
});

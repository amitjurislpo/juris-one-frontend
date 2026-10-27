import { describe, expect, it } from "vitest";
import { onboardingApiFor } from "@/pages/onboarding/actions";
import { displayAddress, displayDate, displayValue, displayYesNo, firstNameUpper, nomineeName, nomineePercentage } from "@/pages/onboarding/summaryFormat";
import type { FamilyMember } from "@/pages/onboarding/types";

const member = (id: string, name: string): FamilyMember => ({ id, name, relationship: "Spouse", dateOfBirth: "", gender: "", bloodGroup: "", nationality: "", isMinor: false, hasMentalIllness: false, guardian: null });

describe("summary formatting", () => {
  it("shows a dash for empty values", () => {
    expect(displayValue("")).toBe("-");
    expect(displayValue("  ")).toBe("-");
    expect(displayValue(null)).toBe("-");
    expect(displayValue(undefined)).toBe("-");
    expect(displayValue("A +ve")).toBe("A +ve");
    expect(displayValue(170)).toBe("170");
  });

  it("formats dates as 10 Aug 1996", () => {
    expect(displayDate("1996-08-10")).toBe("10 Aug 1996");
    expect(displayDate("")).toBe("-");
    expect(displayDate(null)).toBe("-");
  });

  it("formats yes / no / unanswered", () => {
    expect(displayYesNo(true, "Yes", "No")).toBe("Yes");
    expect(displayYesNo(false, "Yes", "No")).toBe("No");
    expect(displayYesNo(null, "Yes", "No")).toBe("-");
  });

  it("joins the filled address parts", () => {
    const address = { line1: "12 Park Road", line2: "", line3: "", city: "Noida", district: "Gautam Buddh Nagar", state: "UP", pin: "201301", country: "India", phone: "" };
    expect(displayAddress(address)).toBe("12 Park Road, Noida, Gautam Buddh Nagar, UP - 201301, India");
    expect(displayAddress({ ...address, line1: "", city: "", district: "", state: "", pin: "", country: "" })).toBe("-");
  });

  it("resolves nominee names and percentages", () => {
    const members = [member("m1", "Asha Rao")];
    expect(nomineeName(members, "m1")).toBe("Asha Rao");
    expect(nomineeName(members, "gone")).toBe("-");
    expect(nomineePercentage({ familyMemberId: "m1", percentage: "60" })).toBe("60%");
    expect(nomineePercentage({ familyMemberId: "m1", percentage: "" })).toBe("-");
  });

  it("takes the first name in capitals", () => {
    expect(firstNameUpper("Amit Jaspal")).toBe("AMIT");
    expect(firstNameUpper("")).toBe("");
  });

  it("builds attachment urls", () => {
    expect(onboardingApiFor({ kind: "mine" }).attachmentUrl("a b", true)).toBe("/api/onboarding/mine/attachments/a%20b/file?download=true");
    expect(onboardingApiFor({ kind: "hr", employeeId: "p1" }).attachmentUrl("f1", false)).toBe("/api/people/p1/onboarding/attachments/f1/file?download=false");
  });
});

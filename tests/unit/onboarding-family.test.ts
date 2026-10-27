import { describe, expect, it } from "vitest";
import { ageInYears, emptyFamilyMember, emptyGuardian, isFamilyMemberUsed, isUnderAge, validateFamily } from "@/pages/onboarding/validation/family";

const today = new Date(2026, 9, 27);
const valid = { ...emptyFamilyMember(), name: "Anju Devi", relationship: "Mother", dateOfBirth: "1970-01-01", gender: "Female", bloodGroup: "O +ve", nationality: "Indian" };

describe("family validation", () => {
  it("computes age and minority", () => {
    expect(ageInYears("2008-10-28", today)).toBe(17);
    expect(ageInYears("2008-10-27", today)).toBe(18);
    expect(ageInYears("", today)).toBeNull();
    expect(isUnderAge("2015-05-05", today)).toBe(true);
    expect(isUnderAge("1990-05-05", today)).toBe(false);
    expect(isUnderAge("2030-01-01", today)).toBe(false);
  });
  it("accepts a complete member", () => {
    expect(validateFamily([valid], today)).toEqual({});
  });
  it("flags every mandatory field with its JSON path", () => {
    const errors = validateFamily([valid, { ...emptyFamilyMember(), name: "Only a name" }], today);
    expect(errors["familyMembers[1].dateOfBirth"]).toBe("DOB is mandatory");
    expect(Object.keys(errors).sort()).toEqual(["bloodGroup", "dateOfBirth", "gender", "nationality", "relationship"].map((field) => `familyMembers[1].${field}`).sort());
  });
  it("ignores an untouched empty block (the seeded Member 1)", () => {
    expect(validateFamily([emptyFamilyMember()], today)).toEqual({});
    expect(isFamilyMemberUsed(emptyFamilyMember())).toBe(false);
    expect(isFamilyMemberUsed({ ...emptyFamilyMember(), hasMentalIllness: true })).toBe(true);
  });
  it("rejects a future date of birth", () => {
    expect(validateFamily([{ ...valid, dateOfBirth: "2030-01-01" }], today)["familyMembers[0].dateOfBirth"]).toBe("Enter a valid date of birth");
  });
  it("requires guardian name, relationship and mobile for a minor", () => {
    const minor = { ...valid, dateOfBirth: "2015-01-01", isMinor: true, guardian: emptyGuardian() };
    const errors = validateFamily([minor], today);
    expect(Object.keys(errors).sort()).toEqual(["familyMembers[0].guardian.mobile", "familyMembers[0].guardian.name", "familyMembers[0].guardian.relationship"]);
    const filled = { ...minor, guardian: { ...emptyGuardian(), name: "A", relationship: "Father", mobile: "9876543210", email: "bad" } };
    expect(validateFamily([filled], today)).toEqual({ "familyMembers[0].guardian.email": "Enter a valid email address" });
  });
});

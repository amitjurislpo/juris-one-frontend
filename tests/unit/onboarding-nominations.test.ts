import { describe, expect, it } from "vitest";
import { emptyNominations, familyMemberLabel, hasBlockErrors, SINGLE_NOMINEE_MESSAGE, TOTAL_MESSAGE, validateNominations } from "@/pages/onboarding/validation/nominations";
import { emptyFamilyMember } from "@/pages/onboarding/validation/family";

describe("nomination validation", () => {
  it("accepts empty nominations", () => {
    expect(validateNominations(emptyNominations())).toEqual({});
  });
  it("labels members as Name (Relationship)", () => {
    expect(familyMemberLabel({ ...emptyFamilyMember(), name: "Anju Devi", relationship: "Mother" })).toBe("Anju Devi (Mother)");
  });
  it("requires a single nominee to be 100", () => {
    const errors = validateNominations({ ...emptyNominations(), epf: [{ familyMemberId: "a", percentage: "50" }] });
    expect(errors["nominations.epf[0].percentage"]).toBe(SINGLE_NOMINEE_MESSAGE);
    expect(validateNominations({ ...emptyNominations(), epf: [{ familyMemberId: "a", percentage: "100" }] })).toEqual({});
  });
  it("requires several nominees to total 100", () => {
    const bad = validateNominations({ ...emptyNominations(), gratuity: [{ familyMemberId: "a", percentage: "50" }, { familyMemberId: "b", percentage: "40" }] });
    expect(bad["nominations.gratuity[0].percentage"]).toBe(TOTAL_MESSAGE);
    const good = validateNominations({ ...emptyNominations(), gratuity: [{ familyMemberId: "a", percentage: "50" }, { familyMemberId: "b", percentage: "50" }] });
    expect(good).toEqual({});
  });
  it("rejects duplicates, blanks and out-of-range numbers", () => {
    const errors = validateNominations({ ...emptyNominations(), epf: [{ familyMemberId: "a", percentage: "50" }, { familyMemberId: "a", percentage: "0" }, { familyMemberId: "", percentage: "30" }, { familyMemberId: "b", percentage: "" }] });
    expect(errors["nominations.epf[1].familyMemberId"]).toBe("This family member is already nominated here");
    expect(errors["nominations.epf[1].percentage"]).toBe("Enter a whole number from 1 to 100");
    expect(errors["nominations.epf[2].familyMemberId"]).toBe("Select a family member");
    expect(errors["nominations.epf[3].percentage"]).toBe("Nomination % is mandatory");
  });
  it("ignores an untouched empty Nominee block", () => {
    expect(validateNominations({ ...emptyNominations(), epf: [{ familyMemberId: "", percentage: "" }], gratuity: [{ familyMemberId: "", percentage: "" }] })).toEqual({});
    expect(validateNominations({ ...emptyNominations(), epf: [{ familyMemberId: "", percentage: "" }, { familyMemberId: "a", percentage: "100" }] })).toEqual({});
    expect(validateNominations({ ...emptyNominations(), epf: [{ familyMemberId: "", percentage: "" }, { familyMemberId: "a", percentage: "60" }] })["nominations.epf[1].percentage"]).toBe(SINGLE_NOMINEE_MESSAGE);
  });
  it("requires a member once EPS or ESI is started", () => {
    const errors = validateNominations({ ...emptyNominations(), eps: { familyMemberId: "" }, esi: { familyMemberId: "x" } });
    expect(Object.keys(errors)).toEqual(["nominations.eps.familyMemberId"]);
    expect(hasBlockErrors(errors, "eps")).toBe(true);
    expect(hasBlockErrors(errors, "esi")).toBe(false);
  });
});

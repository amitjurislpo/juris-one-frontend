import { describe, expect, it } from "vitest";
import { mergeFieldErrors, snapshotServerErrors, valueAtPath } from "@/lib/fieldErrors";
import { haveWatchedValuesChanged } from "@/lib/useDismissOnEdit";
import { draftFromView, emptyEducation, emptyNominee, stepRequestBody, type OnboardingDraft } from "@/pages/onboarding/draft";
import { emptyFamilyMember } from "@/pages/onboarding/validation/family";
import { validateStep } from "@/pages/onboarding/wizardLogic";
import type { OnboardingView } from "@/pages/onboarding/types";

function blankDraft(): OnboardingDraft {
  const blankAddress = { line1: null, line2: null, line3: null, city: null, district: null, state: null, pin: null, country: null, phone: null };
  return draftFromView({
    personal: {}, permanentAddress: blankAddress, presentAddress: { ...blankAddress, isSameAsPermanent: false }, emergencyContact: {}, education: [], courses: [], employments: [],
    bank: {}, statutory: {}, familyMembers: [], nominations: { epf: [], eps: null, esi: null, gratuity: [] }, attachmentSlots: [],
  } as unknown as OnboardingView);
}

describe("valueAtPath", () => {
  const body = { personal: { bloodGroup: "A +ve" }, education: [{ institute: "MDU" }, { institute: "IIM" }], nominations: { eps: { familyMemberId: "f1" } } };
  it("reads dotted and indexed paths", () => {
    expect(valueAtPath(body, "personal.bloodGroup")).toBe("A +ve");
    expect(valueAtPath(body, "education[1].institute")).toBe("IIM");
    expect(valueAtPath(body, "nominations.eps.familyMemberId")).toBe("f1");
  });
  it("gives undefined for a path that is not there", () => {
    expect(valueAtPath(body, "education[5].institute")).toBeUndefined();
    expect(valueAtPath(body, "personal.bloodGroup.x")).toBeUndefined();
    expect(valueAtPath(null, "a.b")).toBeUndefined();
  });
});

describe("mergeFieldErrors", () => {
  it("keeps a server error while its field holds the refused value and drops it once the field is edited", () => {
    const refused = { personal: { personalEmail: "taken@example.com", fatherName: "A" } };
    const server = snapshotServerErrors({ "personal.personalEmail": "Email already used" }, refused);
    expect(mergeFieldErrors({}, server, refused)).toEqual({ "personal.personalEmail": "Email already used" });
    // editing another field does not remove it
    expect(mergeFieldErrors({}, server, { personal: { personalEmail: "taken@example.com", fatherName: "AB" } })).toEqual({ "personal.personalEmail": "Email already used" });
    // editing its own field does
    expect(mergeFieldErrors({}, server, { personal: { personalEmail: "new@example.com", fatherName: "A" } })).toEqual({});
  });
  it("lets a fresh client finding win over a server message for the same field", () => {
    const body = { a: "x" };
    const server = snapshotServerErrors({ a: "from server" }, body);
    expect(mergeFieldErrors({ a: "from client" }, server, body)).toEqual({ a: "from client" });
  });
});

describe("step 1 qualifications re-validated after every edit", () => {
  it("clears only the message of the field that became valid", () => {
    const draft = blankDraft();
    draft.personal.education = [emptyEducation()];
    const first = validateStep(1, draft);
    for (const field of ["qualification", "fromYear", "toYear", "institute", "gradeOrPercentage"]) expect(first[`education[0].${field}`]).toBe("This field is mandatory");

    draft.personal.education = [{ ...draft.personal.education[0], qualification: "B.Tech" }];
    const second = validateStep(1, draft);
    expect(second["education[0].qualification"]).toBeUndefined();
    for (const field of ["fromYear", "toYear", "institute", "gradeOrPercentage"]) expect(second[`education[0].${field}`]).toBe("This field is mandatory");

    draft.personal.education = [{ ...draft.personal.education[0], fromYear: "2008", toYear: "2012", institute: "MDU", gradeOrPercentage: "8" }];
    const third = validateStep(1, draft);
    expect(Object.keys(third).filter((key) => key.startsWith("education"))).toEqual([]);
  });

  it("follows the blocks when one is removed", () => {
    const draft = blankDraft();
    draft.personal.education = [emptyEducation(), { ...emptyEducation(), qualification: "MBA" }];
    expect(validateStep(1, draft)["education[1].qualification"]).toBeUndefined();
    expect(validateStep(1, draft)["education[1].institute"]).toBeDefined();
    draft.personal.education = [draft.personal.education[1]];
    const after = validateStep(1, draft);
    expect(after["education[1].institute"]).toBeUndefined();
    expect(after["education[0].qualification"]).toBeUndefined();
    expect(after["education[0].institute"]).toBeDefined();
  });

  it("drops the Marriage Date message when Married is unselected", () => {
    const draft = blankDraft();
    draft.personal.personal.maritalStatus = "Married";
    expect(validateStep(1, draft)["personal.marriageDate"]).toBe("This field is mandatory");
    draft.personal.personal.maritalStatus = "Single";
    expect(validateStep(1, draft)["personal.marriageDate"]).toBeUndefined();
  });

  it("matches server paths to the request body of the step", () => {
    const draft = blankDraft();
    draft.personal.education = [{ ...emptyEducation(), institute: "MDU" }];
    expect(valueAtPath(stepRequestBody(1, draft), "education[0].institute")).toBe("MDU");
  });
});

describe("other steps", () => {
  it("clears a family member's and a nominee's messages as the values become valid", () => {
    const draft = blankDraft();
    draft.familyMembers = [{ ...emptyFamilyMember(), name: "Anju" }];
    expect(validateStep(4, draft)["familyMembers[0].relationship"]).toBeDefined();
    draft.familyMembers = [{ ...draft.familyMembers[0], relationship: "Mother" }];
    expect(validateStep(4, draft)["familyMembers[0].relationship"]).toBeUndefined();
    expect(validateStep(4, draft)["familyMembers[0].gender"]).toBeDefined();

    draft.nominations.epf = [{ ...emptyNominee(), familyMemberId: "f1" }];
    expect(validateStep(5, draft)["nominations.epf[0].percentage"]).toBeDefined();
    draft.nominations.epf = [{ familyMemberId: "f1", percentage: "100" }];
    expect(validateStep(5, draft)).toEqual({});
  });
});

describe("haveWatchedValuesChanged", () => {
  it("is true only when a value changed", () => {
    const form = { a: 1 };
    expect(haveWatchedValuesChanged([form, "x"], [form, "x"])).toBe(false);
    expect(haveWatchedValuesChanged([form, "x"], [{ ...form }, "x"])).toBe(true);
    expect(haveWatchedValuesChanged([form], [form, "x"])).toBe(true);
  });
});

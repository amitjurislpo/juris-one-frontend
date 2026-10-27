import { describe, expect, it } from "vitest";
import { isOnboardingPath, mustCompleteOnboarding, readOnboardingGate } from "@/lib/onboarding-gate";
import { blankToNull, copyPermanentAddress, draftFromView, stepRequestBody, toFormText, type OnboardingDraft } from "@/pages/onboarding/draft";
import type { OnboardingView } from "@/pages/onboarding/types";
import { isEmploymentUsed, validateEmployments } from "@/pages/onboarding/validation/employment";
import { digitsOnly, MISMATCH_MESSAGE, validateStatutoryStep } from "@/pages/onboarding/validation/statutory";
import { personalSectionProblems, validatePersonalStep } from "@/pages/onboarding/validation/personal";
import { onboardingApiFor } from "@/pages/onboarding/actions";
import { canEditOnboarding, flagCommentsForStep, flaggedSteps, initialStep, mergeSavedStep, stepperState, validateStep } from "@/pages/onboarding/wizardLogic";

const address = { line1: "12 Rose Street", line2: "Sector 4", line3: "Near park", city: "Gurugram", district: "Gurugram", state: "Haryana", pin: "122001", country: "India", phone: "9876543210" };

function blankView(): OnboardingView {
  const blankAddress = { line1: null, line2: null, line3: null, city: null, district: null, state: null, pin: null, country: null, phone: null };
  return {
    status: "NOT_STARTED", currentStep: 1, stepStatus: { 1: "UNVISITED", 2: "UNVISITED", 3: "UNVISITED", 4: "UNVISITED", 5: "UNVISITED", 6: "UNVISITED" }, isReadOnly: false, submittedAt: null,
    header: { name: "Amit Jaspal", employeeCode: "JC074", photoUrl: null, department: null, designation: null, location: null, pointOfContact: null },
    personal: { bloodGroup: null, personalEmail: null, fatherName: null, maritalStatus: null, marriageDate: null, spouseName: null, countryOfOrigin: null, nationality: null, isInternationalEmployee: null, isPhysicallyChallenged: null, disabilityType: null, gender: "Male", dateOfBirth: "1996-08-10", heightCm: 172.5, weightKg: null, identificationMark: null, religion: null, caste: null, hobby: null },
    permanentAddress: blankAddress, presentAddress: { ...blankAddress, isSameAsPermanent: false }, emergencyContact: { name: null, mobile: null, relationship: null },
    education: [], courses: [], employments: [],
    bank: { country: null, bankAccountNumber: "XXXXXXXX1234", hasBankAccountNumber: true, ifsc: null, bankName: null, branch: null, branchAddress: null, nameAsPerBank: null, accountType: null },
    statutory: { previousPfNumber: null, uan: null, hasUan: false, pan: "XXXXXX234F", hasPan: true, namePerPan: null, aadhaar: null, hasAadhaar: false, namePerAadhaar: null, passportNumber: null, namePerPassport: null, passportExpiry: null },
    familyMembers: [], nominations: { epf: [], eps: null, esi: null, gratuity: [] }, attachmentSlots: [],
  } as unknown as OnboardingView;
}

function filledPersonal(): OnboardingDraft["personal"] {
  const draft = draftFromView(blankView()).personal;
  return {
    ...draft,
    personal: { ...draft.personal, bloodGroup: "A +ve", personalEmail: "amit@gmail.com", fatherName: "Raj", maritalStatus: "Single", countryOfOrigin: "India", nationality: "Indian", isInternationalEmployee: false, isPhysicallyChallenged: false },
    permanentAddress: address,
    presentAddress: copyPermanentAddress(address),
    emergencyContact: { name: "Anju", mobile: "9876543210", relationship: "Mother" },
    education: [{ id: null, qualification: "B.Tech", fromYear: "2014", toYear: "2018", institute: "MDU, Rohtak", gradeOrPercentage: "8.1" }],
  };
}

describe("a blank form", () => {
  it("starts blank except the master data, with one empty education block and India as the country", () => {
    const draft = draftFromView(blankView());
    expect(draft.personal.personal.bloodGroup).toBe("");
    expect(draft.personal.personal.gender).toBe("Male");
    expect(draft.personal.personal.dateOfBirth).toBe("1996-08-10");
    expect(draft.personal.personal.heightCm).toBe("172.5"); // numbers become text
    expect(draft.personal.personal.isInternationalEmployee).toBeNull();
    expect(draft.personal.education).toHaveLength(1);
    expect(draft.personal.permanentAddress.country).toBe("India");
    // Employment 1 starts as one empty block; so do Member 1 and the EPF / Gratuity Nominee 1
    expect(draft.employments).toHaveLength(1);
    expect(isEmploymentUsed(draft.employments[0])).toBe(false);
    expect(draft.familyMembers).toHaveLength(1);
    expect(draft.nominations.epf).toEqual([{ familyMemberId: "", percentage: "" }]);
    expect(draft.nominations.gratuity).toHaveLength(1);
  });

  it("keeps saved masked values untouched (null) so the API keeps them", () => {
    const draft = draftFromView(blankView());
    expect(draft.statutory.bank.bankAccountNumber).toBeNull();
    expect(draft.statutory.statutory.pan).toBeNull();
    expect(draft.statutory.statutory.aadhaar).toBe("");
  });
});

describe("step 1 validation", () => {
  it("flags every mandatory field of a blank step", () => {
    const errors = validatePersonalStep(draftFromView(blankView()).personal);
    for (const key of ["personal.bloodGroup", "personal.personalEmail", "personal.fatherName", "personal.maritalStatus", "personal.isPhysicallyChallenged", "permanentAddress.line1", "permanentAddress.pin", "emergencyContact.mobile", "education[0].institute"]) {
      expect(errors[key], key).toBeTruthy();
    }
    expect(errors["permanentAddress.district"]).toBeUndefined(); // District is optional
    expect(personalSectionProblems(errors)).toEqual([true, true, true]);
  });

  it("accepts a fully filled step", () => {
    expect(validatePersonalStep(filledPersonal())).toEqual({});
  });

  it("requires the marriage date only when Married, and the disability type only when physically challenged", () => {
    const value = filledPersonal();
    expect(validatePersonalStep({ ...value, personal: { ...value.personal, maritalStatus: "Married" } })["personal.marriageDate"]).toBeTruthy();
    expect(validatePersonalStep({ ...value, personal: { ...value.personal, maritalStatus: "Married", marriageDate: "2020-01-02" } })["personal.marriageDate"]).toBeUndefined();
    expect(validatePersonalStep({ ...value, personal: { ...value.personal, isPhysicallyChallenged: true } })["personal.disabilityType"]).toBeTruthy();
    expect(validatePersonalStep({ ...value, personal: { ...value.personal, isPhysicallyChallenged: true, disabilityType: "Visual" } })["personal.disabilityType"]).toBeUndefined();
  });

  it("checks formats, the date of birth and the year order", () => {
    const value = filledPersonal();
    const broken = {
      ...value,
      personal: { ...value.personal, personalEmail: "nope", dateOfBirth: "2999-01-01" },
      permanentAddress: { ...address, pin: "12", phone: "123" },
      education: [{ ...value.education[0], fromYear: "2018", toYear: "2014" }],
    };
    const errors = validatePersonalStep(broken, new Date("2026-10-27"));
    expect(errors["personal.personalEmail"]).toBe("Enter a valid email address");
    expect(errors["personal.dateOfBirth"]).toBe("Date cannot be in the future");
    expect(errors["permanentAddress.pin"]).toBe("Enter a 6-digit PIN code");
    expect(errors["permanentAddress.phone"]).toBe("Enter a 10-digit number");
    expect(errors["education[0].toYear"]).toBe("To year cannot be before from year");
  });

  it("skips the present address when it is the same as the permanent one", () => {
    const value = filledPersonal();
    expect(Object.keys(validatePersonalStep({ ...value, presentAddress: { ...copyPermanentAddress(address), line1: "" } }))).toEqual([]);
    expect(validatePersonalStep({ ...value, presentAddress: { ...address, line1: "", isSameAsPermanent: false } })["presentAddress.line1"]).toBeTruthy();
  });
});

describe("Same as above", () => {
  it("copies every permanent value, District included, and sets the flag", () => {
    const copy = copyPermanentAddress(address);
    expect(copy).toEqual({ ...address, isSameAsPermanent: true });
    expect(copy.district).toBe("Gurugram");
  });

  it("is sent as a full copy in the step 1 request even if the present fields were never filled", () => {
    const value = filledPersonal();
    const draft = { ...draftFromView(blankView()), personal: { ...value, presentAddress: { ...value.presentAddress, line1: "", district: "", isSameAsPermanent: true } } };
    const body = stepRequestBody(1, draft) as { presentAddress: { line1: string; district: string; isSameAsPermanent: boolean } };
    expect(body.presentAddress).toMatchObject({ line1: "12 Rose Street", district: "Gurugram", isSameAsPermanent: true });
  });
});

describe("step 2 validation", () => {
  it("lets an empty or untouched block pass (freshers skip it)", () => {
    expect(validateEmployments([])).toEqual({});
    expect(validateEmployments([{ id: null, companyName: "", designation: "", lastDrawnSalary: "", fromDate: "", toDate: "", reasonForLeaving: "", companyAddress: "" }])).toEqual({});
  });

  it("does not send or validate the untouched first blocks", () => {
    const draft = draftFromView(blankView());
    expect(stepRequestBody(2, draft)).toEqual({ employments: [] });
    expect(stepRequestBody(4, draft)).toEqual({ familyMembers: [] });
    expect(stepRequestBody(5, draft)).toEqual({ nominations: { epf: [], eps: null, esi: null, gratuity: [] } });
    expect(validateStep(2, draft)).toEqual({});
    expect(validateStep(4, draft)).toEqual({});
    expect(validateStep(5, draft)).toEqual({});
  });

  it("needs company, from and to dates once a block is started, and to >= from", () => {
    const started = { id: null, companyName: "", designation: "Analyst", lastDrawnSalary: "", fromDate: "", toDate: "", reasonForLeaving: "", companyAddress: "" };
    expect(isEmploymentUsed(started)).toBe(true);
    expect(Object.keys(validateEmployments([started])).sort()).toEqual(["employments[0].companyName", "employments[0].fromDate", "employments[0].toDate"]);
    const backwards = { ...started, companyName: "Acme", fromDate: "2020-05-01", toDate: "2020-01-01" };
    expect(validateEmployments([backwards])["employments[0].toDate"]).toBe("To date cannot be before from date");
  });
});

describe("step 3 validation", () => {
  const filled = () => {
    const draft = draftFromView(blankView()).statutory;
    return {
      ...draft,
      bank: { ...draft.bank, bankAccountNumber: "123456789012", ifsc: "ICIC0000571", nameAsPerBank: "Amit Jaspal", accountType: "Saving" },
      confirmBankAccountNumber: "123456789012",
      statutory: { ...draft.statutory, pan: "ABCDE1234F", namePerPan: "Amit Jaspal", aadhaar: "123456789012", namePerAadhaar: "Amit Jaspal" },
    };
  };

  it("accepts a complete step", () => {
    expect(validateStatutoryStep(filled())).toEqual({});
  });

  it("shows 'Account numbers do not match' on the confirm field", () => {
    expect(validateStatutoryStep({ ...filled(), confirmBankAccountNumber: "123456789013" }).confirmBankAccountNumber).toBe(MISMATCH_MESSAGE);
    expect(MISMATCH_MESSAGE).toBe("Account numbers do not match");
  });

  it("does not ask for a saved (null) account number again, but does check a typed one", () => {
    const saved = { ...filled(), confirmBankAccountNumber: "" };
    expect(validateStatutoryStep({ ...saved, bank: { ...saved.bank, bankAccountNumber: null } })).toEqual({});
    expect(validateStatutoryStep({ ...saved, bank: { ...saved.bank, bankAccountNumber: "123" } })["bank.bankAccountNumber"]).toBe("Enter 9 to 18 digits");
  });

  it("checks the IFSC, PAN, Aadhaar and UAN formats", () => {
    const value = filled();
    const errors = validateStatutoryStep({ ...value, bank: { ...value.bank, ifsc: "ICIC123" }, statutory: { ...value.statutory, pan: "abc", aadhaar: "123", uan: "55" } });
    expect(errors["bank.ifsc"]).toBeTruthy();
    expect(errors["statutory.pan"]).toBeTruthy();
    expect(errors["statutory.aadhaar"]).toBe("Enter a 12-digit number");
    expect(errors["statutory.uan"]).toBe("Enter a 12-digit number");
  });

  it("needs the passport expiry date once a passport number is entered", () => {
    const value = filled();
    expect(validateStatutoryStep({ ...value, statutory: { ...value.statutory, passportNumber: "P1234567" } })["statutory.passportExpiry"]).toBeTruthy();
  });

  it("digitsOnly strips letters and limits the length", () => {
    expect(digitsOnly("12a3-4 5", 4)).toBe("1234");
  });
});

describe("request bodies", () => {
  it("turns empty text into null and numbers stay strings the API can coerce", () => {
    expect(blankToNull({ a: "", b: ["x", ""], c: { d: "" }, e: false, f: null })).toEqual({ a: null, b: ["x", null], c: { d: null }, e: false, f: null });
    expect(toFormText({ id: null, name: null, size: 3, flag: true })).toEqual({ id: null, name: "", size: "3", flag: true });
  });

  it("sends step 3 without the client-only confirm field and keeps null for an untouched masked value", () => {
    const body = stepRequestBody(3, draftFromView(blankView())) as { bank: Record<string, unknown>; statutory: Record<string, unknown> };
    expect(body.bank).not.toHaveProperty("confirmBankAccountNumber");
    expect(body.bank.bankAccountNumber).toBeNull();
    expect(body.statutory.pan).toBeNull();
  });
});

describe("wizard logic", () => {
  it("validateStep dispatches per step", () => {
    const draft = draftFromView(blankView());
    expect(Object.keys(validateStep(1, draft)).length).toBeGreaterThan(5);
    expect(validateStep(2, draft)).toEqual({});
    expect(validateStep(6, draft)).toEqual({});
  });

  it("stepper states: active wins, then incomplete, complete, unvisited", () => {
    expect(stepperState(2, 2, "COMPLETE", true)).toBe("active");
    expect(stepperState(1, 2, "COMPLETE", true)).toBe("incomplete");
    expect(stepperState(1, 2, "INCOMPLETE", false)).toBe("incomplete");
    expect(stepperState(1, 2, "COMPLETE", false)).toBe("complete");
    expect(stepperState(3, 2, "UNVISITED", false)).toBe("unvisited");
    expect(stepperState(3, 2, undefined, false)).toBe("unvisited");
    // a step HR flagged is red, unless it is the active one
    expect(stepperState(1, 2, "COMPLETE", false, true)).toBe("flagged");
    expect(stepperState(2, 2, "COMPLETE", false, true)).toBe("active");
  });

  it("opens at ?step=N or the server's current step", () => {
    expect(initialStep("4", 2)).toBe(4);
    expect(initialStep("9", 2)).toBe(2);
    expect(initialStep(undefined, 3)).toBe(3);
  });

  it("after a save only the saved step's data is replaced", () => {
    const draft = draftFromView(blankView());
    const typed = { ...draft, employments: [{ id: null, companyName: "Typed but unsaved", designation: "", lastDrawnSalary: "", fromDate: "", toDate: "", reasonForLeaving: "", companyAddress: "" }] };
    const saved = blankView();
    saved.personal.fatherName = "Raj";
    const merged = mergeSavedStep(typed, saved, 1);
    expect(merged.personal.personal.fatherName).toBe("Raj");
    expect(merged.employments[0].companyName).toBe("Typed but unsaved");
  });
});

describe("onboarding redirect gate", () => {
  it("reads the session payload in one place", () => {
    expect(readOnboardingGate({})).toBeNull();
    expect(readOnboardingGate({ onboarding: { status: "IN_PROGRESS", isRequired: true } })).toEqual({ status: "IN_PROGRESS", isRequired: true });
    // without isRequired the status decides: only these four lock the employee
    for (const status of ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "CHANGES_REQUESTED"]) expect(readOnboardingGate({ onboarding: { status } })?.isRequired).toBe(true);
    for (const status of ["APPROVED", "NOT_REQUIRED"]) expect(readOnboardingGate({ onboarding: { status } })?.isRequired).toBe(false);
  });

  it("lets a locked employee open only the onboarding pages", () => {
    for (const path of ["/onboarding", "/onboarding/", "/onboarding/summary", "/onboarding/success"]) expect(isOnboardingPath(path)).toBe(true);
    for (const path of ["/", "/home", "/leave", "/onboarding/hires/abc"]) expect(isOnboardingPath(path)).toBe(false);
  });

  it("maps every HR flag to its step", () => {
    const flags = [
      { section: "PERSONAL", comment: "a" }, { section: "QUALIFICATIONS", comment: "b" }, { section: "ACCOUNTS", comment: "c" }, { section: "ATTACHMENTS", comment: "d" },
    ] as const;
    expect([...flaggedSteps([...flags])].sort()).toEqual([1, 3, 6]);
    expect(flagCommentsForStep([...flags], 1)).toEqual({ PERSONAL: "a", QUALIFICATIONS: "b" });
    expect(flagCommentsForStep([...flags], 2)).toEqual({});
    const allSections = ["PERSONAL", "ADDRESS", "QUALIFICATIONS", "EMPLOYMENT", "ACCOUNTS", "FAMILY", "NOMINATIONS", "ATTACHMENTS"] as const;
    expect(allSections.map((section) => [...flaggedSteps([{ section, comment: "" }])][0])).toEqual([1, 1, 1, 2, 3, 4, 5, 6]);
  });

  it("holds an employee back until the onboarding is submitted", () => {
    expect(mustCompleteOnboarding(null)).toBe(false);
    expect(mustCompleteOnboarding({ status: "NOT_STARTED", isRequired: true })).toBe(true);
    expect(mustCompleteOnboarding({ status: "IN_PROGRESS", isRequired: true })).toBe(true);
    expect(mustCompleteOnboarding({ status: "CHANGES_REQUESTED", isRequired: true })).toBe(true);
    expect(mustCompleteOnboarding({ status: "SUBMITTED", isRequired: true })).toBe(true); // waiting for HR: still locked
    expect(mustCompleteOnboarding({ status: "APPROVED", isRequired: false })).toBe(false);
    expect(mustCompleteOnboarding({ status: "NOT_REQUIRED", isRequired: false })).toBe(false);
    expect(mustCompleteOnboarding({ status: "NOT_STARTED", isRequired: false })).toBe(false);
  });
});

describe("onboarding api target", () => {
  it("uses /api/onboarding/mine for the employee and /api/people/{id}/onboarding for HR", () => {
    expect(onboardingApiFor({ kind: "mine" }).viewPath).toBe("/api/onboarding/mine");
    expect(onboardingApiFor({ kind: "hr", employeeId: "e 1" }).viewPath).toBe("/api/people/e%201/onboarding");
  });

  it("lets HR edit a submitted onboarding but not the employee, and nobody an approved one", () => {
    const view = (status: OnboardingView["status"]) => ({ ...blankView(), status });
    expect(canEditOnboarding(view("IN_PROGRESS"), { kind: "mine" })).toBe(true);
    expect(canEditOnboarding(view("CHANGES_REQUESTED"), { kind: "mine" })).toBe(true);
    expect(canEditOnboarding(view("SUBMITTED"), { kind: "mine" })).toBe(false);
    expect(canEditOnboarding(view("SUBMITTED"), { kind: "hr", employeeId: "e1" })).toBe(true);
    expect(canEditOnboarding(view("APPROVED"), { kind: "hr", employeeId: "e1" })).toBe(false);
  });
});

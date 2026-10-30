import { DEFAULT_COUNTRY } from "./options";
import { isEmploymentUsed } from "./validation/employment";
import { emptyFamilyMember, isFamilyMemberUsed } from "./validation/family";
import { isNomineeUsed } from "./validation/nominations";
import type {
  Address, BankDetails, Course, Education, EmergencyContact, Employment, FamilyMember, Nominations, Nominee, OnboardingView, PersonalInformation, PresentAddress,
  StatutoryDetails, StepNumber,
} from "./types";

/** What the employee edits in step 1 (saved together). */
export interface PersonalStepValue {
  personal: PersonalInformation; permanentAddress: Address; presentAddress: PresentAddress; emergencyContact: EmergencyContact; education: Education[]; courses: Course[];
}

/**
 * What the employee edits in step 3. A masked field (account number, PAN, Aadhaar, UAN) is `null` while the employee has not
 * touched it: the API then keeps the stored value. `confirmBankAccountNumber` never leaves the browser.
 */
export interface StatutoryStepValue { bank: BankDetails; statutory: StatutoryDetails; confirmBankAccountNumber: string }

/** The employee's unsaved work: one entry per step that has a form. Step 6 (attachments) uploads on its own. */
export interface OnboardingDraft {
  personal: PersonalStepValue; employments: Employment[]; statutory: StatutoryStepValue; familyMembers: FamilyMember[]; nominations: Nominations;
}

/** Fields whose `null` means something (not "blank text"). */
const MEANINGFUL_NULLS = new Set(["id", "isInternationalEmployee", "isPhysicallyChallenged", "guardian", "eps", "esi", "bankAccountNumber", "uan", "pan", "aadhaar"]);

/** The API sends `null` for empty text and numbers for numeric fields; the forms work with strings only. */
export function toFormText<Section extends object>(section: Section): Section {
  const copy: Record<string, unknown> = {};
  for (const [field, fieldValue] of Object.entries(section)) {
    if (fieldValue === null && !MEANINGFUL_NULLS.has(field)) copy[field] = "";
    else if (typeof fieldValue === "number") copy[field] = String(fieldValue);
    else copy[field] = fieldValue;
  }
  return copy as Section;
}

/** Empty text becomes `null` before it is sent (an empty date or number would not parse). */
export function blankToNull(value: unknown): unknown {
  if (value === "") return null;
  if (Array.isArray(value)) return value.map(blankToNull);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([field, fieldValue]) => [field, blankToNull(fieldValue)]));
  return value;
}

export function emptyEducation(): Education { return { id: null, qualification: "", fromYear: "", toYear: "", institute: "", gradeOrPercentage: "" }; }
export function emptyCourse(): Course { return { id: null, courseName: "", institute: "", fromYear: "", toYear: "" }; }
export function emptyEmployment(): Employment {
  return { id: null, companyName: "", designation: "", lastDrawnSalary: "", fromDate: "", toDate: "", reasonForLeaving: "", companyAddress: "" };
}

export function emptyNominee(): Nominee { return { familyMemberId: "", percentage: "" }; }

/** Builds the editable draft from the API payload (also used after every save, so server ids and regenerated data win). */
export function draftFromView(view: OnboardingView): OnboardingDraft {
  const bank = toFormText(view.bank);
  const statutory = toFormText(view.statutory);
  return {
    personal: {
      personal: toFormText(view.personal),
      permanentAddress: { ...toFormText(view.permanentAddress), country: view.permanentAddress.country || DEFAULT_COUNTRY },
      presentAddress: { ...toFormText(view.presentAddress), country: view.presentAddress.country || DEFAULT_COUNTRY, isSameAsPermanent: view.presentAddress.isSameAsPermanent ?? false },
      emergencyContact: toFormText(view.emergencyContact),
      education: view.education.length > 0 ? view.education.map(toFormText) : [emptyEducation()],
      courses: view.courses.map(toFormText),
    },
    // Employment, Member and Nominee start with one empty block ("Employment 1"); an untouched one is ignored when validating and saving
    employments: view.employments.length > 0 ? view.employments.map(toFormText) : [emptyEmployment()],
    statutory: {
      bank: { ...bank, country: bank.country || DEFAULT_COUNTRY, bankAccountNumber: view.bank.hasBankAccountNumber ? null : "" },
      statutory: { ...statutory, uan: view.statutory.hasUan ? null : "", pan: view.statutory.hasPan ? null : "", aadhaar: view.statutory.hasAadhaar ? null : "" },
      confirmBankAccountNumber: "",
    },
    familyMembers: view.familyMembers.length > 0
      ? view.familyMembers.map((member) => ({ ...toFormText(member), guardian: member.guardian ? toFormText(member.guardian) : null }))
      : [emptyFamilyMember()],
    nominations: {
      epf: view.nominations.epf.length > 0 ? view.nominations.epf.map(toFormText) : [emptyNominee()],
      eps: view.nominations.eps,
      esi: view.nominations.esi,
      gratuity: view.nominations.gratuity.length > 0 ? view.nominations.gratuity.map(toFormText) : [emptyNominee()],
    },
  };
}

/** Copies every permanent address value, District included, into the present address (and keeps the "same as above" flag on). */
export function copyPermanentAddress(permanentAddress: Address): PresentAddress {
  return { ...permanentAddress, isSameAsPermanent: true };
}

/** The request body for `PUT /api/v1/onboarding/mine/steps/{step}`. */
export function stepRequestBody(step: StepNumber, draft: OnboardingDraft): unknown {
  switch (step) {
    case 1: return blankToNull({
      ...draft.personal,
      // a present address that mirrors the permanent one is sent as a full copy so the API never sees half of it
      presentAddress: draft.personal.presentAddress.isSameAsPermanent ? copyPermanentAddress(draft.personal.permanentAddress) : draft.personal.presentAddress,
    });
    case 2: return blankToNull({ employments: draft.employments.filter(isEmploymentUsed) });
    case 3: return blankToNull({ bank: draft.statutory.bank, statutory: draft.statutory.statutory });
    case 4: return blankToNull({ familyMembers: draft.familyMembers.filter(isFamilyMemberUsed) });
    case 5: return blankToNull({ nominations: { ...draft.nominations, epf: draft.nominations.epf.filter(isNomineeUsed), gratuity: draft.nominations.gratuity.filter(isNomineeUsed) } });
    case 6: return {};
  }
}

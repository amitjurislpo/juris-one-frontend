import type { FamilyMember, FieldErrors } from "../types";

export const FAMILY_RELATIONSHIPS = ["Father", "Mother", "Husband", "Wife", "Son", "Daughter", "Brother", "Sister"];
export const FAMILY_GENDERS = ["Male", "Female", "Others"];
export const BLOOD_GROUP_OPTIONS = ["A +ve", "A -ve", "B +ve", "B -ve", "AB +ve", "AB -ve", "O +ve", "O -ve"];
export const FAMILY_NATIONALITIES = ["Indian", "Others"];
const MINOR_AGE_YEARS = 18;
const MOBILE_PATTERN = /^[0-9]{10}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Age in whole years on `today` for an ISO date, or null when the date is empty or invalid. */
export function ageInYears(dateOfBirth: string, today: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

export function isUnderAge(dateOfBirth: string, today: Date = new Date()): boolean {
  const age = ageInYears(dateOfBirth, today);
  return age !== null && age >= 0 && age < MINOR_AGE_YEARS;
}

export function emptyGuardian(): NonNullable<FamilyMember["guardian"]> {
  return { name: "", relationship: "", line1: "", line2: "", line3: "", city: "", state: "", country: "", pin: "", mobile: "", email: "" };
}

export function emptyFamilyMember(): FamilyMember {
  return { id: null, name: "", relationship: "", dateOfBirth: "", gender: "", bloodGroup: "", nationality: "", isMinor: false, hasMentalIllness: false, guardian: null };
}

/** A block counts as used as soon as anything is typed, picked or ticked; the untouched first block is ignored (not validated, not sent). */
export function isFamilyMemberUsed(member: FamilyMember): boolean {
  return [member.name, member.relationship, member.dateOfBirth, member.gender, member.bloodGroup, member.nationality].some((text) => text.trim() !== "") || member.isMinor || member.hasMentalIllness;
}

/** Errors keyed like "familyMembers[0].dateOfBirth"; messages are English translation keys. */
export function validateFamily(members: FamilyMember[], today: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {};
  members.forEach((member, index) => {
    if (!isFamilyMemberUsed(member)) return;
    const key = (field: string) => `familyMembers[${index}].${field}`;
    const required: [string, string, string][] = [
      ["name", member.name, "Name is mandatory"],
      ["relationship", member.relationship, "Relationship is mandatory"],
      ["gender", member.gender, "Gender is mandatory"],
      ["bloodGroup", member.bloodGroup, "Blood group is mandatory"],
      ["nationality", member.nationality, "Nationality is mandatory"],
    ];
    for (const [field, value, message] of required) if (!value.trim()) errors[key(field)] = message;
    if (!member.dateOfBirth) errors[key("dateOfBirth")] = "DOB is mandatory";
    else if (ageInYears(member.dateOfBirth, today) === null || (ageInYears(member.dateOfBirth, today) ?? 0) < 0) errors[key("dateOfBirth")] = "Enter a valid date of birth";
    if (member.isMinor && member.guardian) {
      const guardian = member.guardian;
      if (!guardian.name.trim()) errors[key("guardian.name")] = "Guardian name is mandatory";
      if (!guardian.relationship.trim()) errors[key("guardian.relationship")] = "Relationship is mandatory";
      if (!guardian.mobile.trim()) errors[key("guardian.mobile")] = "Mobile number is mandatory";
      else if (!MOBILE_PATTERN.test(guardian.mobile.trim())) errors[key("guardian.mobile")] = "Enter a 10-digit mobile number";
      if (guardian.email.trim() && !EMAIL_PATTERN.test(guardian.email.trim())) errors[key("guardian.email")] = "Enter a valid email address";
    } else if (member.isMinor) {
      errors[key("guardian.name")] = "Guardian name is mandatory";
      errors[key("guardian.mobile")] = "Mobile number is mandatory";
      errors[key("guardian.relationship")] = "Relationship is mandatory";
    }
  });
  return errors;
}

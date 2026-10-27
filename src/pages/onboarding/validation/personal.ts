import type { PersonalStepValue } from "../draft";
import type { Address, FieldErrors } from "../types";
import { checkPattern, EMAIL_PATTERN, hasErrorUnder, isBlank, MANDATORY_MESSAGE, requirePattern, requireText, todayIso } from "./common";

const PHONE_PATTERN = /^[0-9]{10}$/;
const PIN_PATTERN = /^[0-9]{6}$/;
const PHONE_MESSAGE = "Enter a 10-digit number";
const PIN_MESSAGE = "Enter a 6-digit PIN code";
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

function validateAddress(errors: FieldErrors, prefix: string, address: Address): void {
  requireText(errors, `${prefix}.line1`, address.line1);
  requireText(errors, `${prefix}.city`, address.city);
  requireText(errors, `${prefix}.state`, address.state);
  requirePattern(errors, `${prefix}.pin`, address.pin, PIN_PATTERN, PIN_MESSAGE);
  requireText(errors, `${prefix}.country`, address.country);
  requirePattern(errors, `${prefix}.phone`, address.phone, PHONE_PATTERN, PHONE_MESSAGE);
}

/** Step 1 rules (spec: Personal Information, Address, Qualifications). Keys follow the request body: "personal.bloodGroup", "education[1].institute". */
export function validatePersonalStep(value: PersonalStepValue, today: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {};
  const { personal, permanentAddress, presentAddress, emergencyContact } = value;
  requireText(errors, "personal.bloodGroup", personal.bloodGroup);
  requirePattern(errors, "personal.personalEmail", personal.personalEmail, EMAIL_PATTERN, "Enter a valid email address");
  requireText(errors, "personal.fatherName", personal.fatherName);
  requireText(errors, "personal.maritalStatus", personal.maritalStatus);
  if (personal.maritalStatus === "Married") requireText(errors, "personal.marriageDate", personal.marriageDate);
  requireText(errors, "personal.countryOfOrigin", personal.countryOfOrigin);
  requireText(errors, "personal.nationality", personal.nationality);
  if (personal.isInternationalEmployee === null) errors["personal.isInternationalEmployee"] = MANDATORY_MESSAGE;
  if (personal.isPhysicallyChallenged === null) errors["personal.isPhysicallyChallenged"] = MANDATORY_MESSAGE;
  else if (personal.isPhysicallyChallenged) requireText(errors, "personal.disabilityType", personal.disabilityType);
  if (!isBlank(personal.dateOfBirth) && personal.dateOfBirth > todayIso(today)) errors["personal.dateOfBirth"] = "Date cannot be in the future";
  checkPattern(errors, "personal.heightCm", personal.heightCm, DECIMAL_PATTERN, "Enter a number");
  checkPattern(errors, "personal.weightKg", personal.weightKg, DECIMAL_PATTERN, "Enter a number");

  validateAddress(errors, "permanentAddress", permanentAddress);
  if (!presentAddress.isSameAsPermanent) validateAddress(errors, "presentAddress", presentAddress);

  requireText(errors, "emergencyContact.name", emergencyContact.name);
  requirePattern(errors, "emergencyContact.mobile", emergencyContact.mobile, PHONE_PATTERN, PHONE_MESSAGE);
  requireText(errors, "emergencyContact.relationship", emergencyContact.relationship);

  value.education.forEach((education, index) => {
    const key = (field: string) => `education[${index}].${field}`;
    requireText(errors, key("qualification"), education.qualification);
    requireText(errors, key("fromYear"), education.fromYear);
    requireText(errors, key("toYear"), education.toYear);
    if (!isBlank(education.fromYear) && !isBlank(education.toYear) && Number(education.toYear) < Number(education.fromYear)) errors[key("toYear")] = "To year cannot be before from year";
    requireText(errors, key("institute"), education.institute);
    requireText(errors, key("gradeOrPercentage"), education.gradeOrPercentage);
  });
  value.courses.forEach((course, index) => {
    if (!isBlank(course.fromYear) && !isBlank(course.toYear) && Number(course.toYear) < Number(course.fromYear)) errors[`courses[${index}].toYear`] = "To year cannot be before from year";
  });
  return errors;
}

/** Which of the three accordion sections of step 1 hold an error. */
export function personalSectionProblems(errors: FieldErrors): [boolean, boolean, boolean] {
  return [hasErrorUnder(errors, "personal"), hasErrorUnder(errors, "permanentAddress", "presentAddress", "emergencyContact"), hasErrorUnder(errors, "education", "courses")];
}

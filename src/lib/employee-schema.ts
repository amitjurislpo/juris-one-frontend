import { PAN_PATTERN, validAadhaar, validUan } from "./people-rules";
import { phoneProblem } from "./phone";

/**
 * Add / edit employee (REQUIREMENTS §5.2). Shared by the 3-step form and the server action.
 * On edit, blank PII fields mean "keep what's on file". PAN, Aadhaar and UAN are optional (checked when given).
 */
export interface EmployeeInput {
  // step 1 · personal
  firstName: string;
  middleName: string;
  lastName: string;
  fatherName: string;
  email: string;
  phoneCountry: string;
  phone: string;
  /** empty = India (IST) */
  location: string;
  joiningOffice: string;
  // step 2 · identity & address (India only for IDs)
  pan: string;
  aadhaar: string;
  uan: string;
  address: string;
  // step 3 · job & access
  designation: string;
  departmentId: string;
  managerId: string;
  dateOfJoining: string;
  shift: "IN_NIGHT" | "IN_DAY" | "US_DAY";
  roleId: string;
  // optional attributes of the slim add-employee form
  /** empty = not set */
  employmentType: EmploymentType | "";
  /** how the employee is paid; required when adding */
  paymentType: PaymentType | "";
  gender: Gender | "";
  /** empty = the next number of the business's series (Auto); a typed code is Custom */
  employeeCode: string;
}

export const EMPLOYMENT_TYPES = ["PERMANENT", "PROBATION", "CONTRACT", "INTERN", "CONSULTANT", "PART_TIME", "FIXED_TERM"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  PERMANENT: "Permanent", PROBATION: "Probation", CONTRACT: "Contract", INTERN: "Intern / Trainee", CONSULTANT: "Consultant", PART_TIME: "Part-time", FIXED_TERM: "Fixed-term / Temporary",
};
export const PAYMENT_TYPES = ["BANK_TRANSFER", "CHEQUE", "CASH"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = { BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque", CASH: "Cash" };
export const GENDERS = ["FEMALE", "MALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = { FEMALE: "Female", MALE: "Male", OTHER: "Other" };

/** A typed employee code: capital letters then digits (no hyphen), like JSC07. */
const CUSTOM_CODE_PATTERN = /^[A-Z]{1,10}[0-9]{1,6}$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type StepErrors = Partial<Record<keyof EmployeeInput, string>>;

/** Step-by-step checks shown in the form (and re-run on the server). */
export function stepErrors(step: 1 | 2 | 3, form: EmployeeInput, editing: boolean, hadManager = false, isCodeManual = false): StepErrors {
  const errors: StepErrors = {};
  const india = !form.location || form.location === "IN_IST";
  if (step === 1) {
    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";
    if (editing && form.fatherName.trim().length < 2) errors.fatherName = "Father’s name is required";
    if (!editing && form.fatherName.trim() && form.fatherName.trim().length < 2) errors.fatherName = "Father’s name is required";
    if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email";
    if (form.phone || !editing) { const problem = phoneProblem(form.phoneCountry, form.phone); if (problem) errors.phone = problem; }
    if (!editing && !form.paymentType) errors.paymentType = "Choose how the employee is paid";
    if (!editing && isCodeManual && !form.employeeCode.trim()) errors.employeeCode = "Type the employee code";
    if (form.employeeCode.trim() && !CUSTOM_CODE_PATTERN.test(form.employeeCode.trim().toUpperCase())) errors.employeeCode = "The employee code is capital letters followed by digits, like JSC07";
  }
  if (step === 2 && india) {
    if (form.pan && !PAN_PATTERN.test(form.pan.trim().toUpperCase())) errors.pan = "PAN looks like ABCDE1234F";
    if (form.aadhaar && !validAadhaar(form.aadhaar)) errors.aadhaar = "Aadhaar has 12 digits";
    if (form.uan && !validUan(form.uan)) errors.uan = "UAN has 12 digits";
  }
  // adding: designation, department, manager, joining date and role are optional (the server defaults them); editing keeps the full rules
  if (step === 3 && editing) {
    if (form.designation.trim().length < 2) errors.designation = "Designation is required";
    if (!form.departmentId) errors.departmentId = "Pick a department";
    if (!form.managerId && (!editing || hadManager)) errors.managerId = "Pick a reporting manager";
    if (!form.dateOfJoining) errors.dateOfJoining = "Pick the date of joining";
    if (!form.roleId) errors.roleId = "Pick a role";
  }
  return errors;
}

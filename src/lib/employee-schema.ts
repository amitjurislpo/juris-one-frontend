import { PAN_RE, validAadhaar, validUan } from "./people-rules";
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
  doj: string;
  shift: "IN_NIGHT" | "IN_DAY" | "US_DAY";
  roleId: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type StepErrors = Partial<Record<keyof EmployeeInput, string>>;

/** Step-by-step checks shown in the form (and re-run on the server). */
export function stepErrors(step: 1 | 2 | 3, f: EmployeeInput, editing: boolean, hadManager = false): StepErrors {
  const x: StepErrors = {};
  const india = !f.location || f.location === "IN_IST";
  if (step === 1) {
    if (!f.firstName.trim()) x.firstName = "First name is required";
    if (!f.lastName.trim()) x.lastName = "Last name is required";
    if (f.fatherName.trim().length < 2) x.fatherName = "Father’s name is required";
    if (!EMAIL_RE.test(f.email.trim())) x.email = "Enter a valid email";
    if (f.phone || !editing) { const p = phoneProblem(f.phoneCountry, f.phone); if (p) x.phone = p; }
  }
  if (step === 2 && india) {
    if (f.pan && !PAN_RE.test(f.pan.trim().toUpperCase())) x.pan = "PAN looks like ABCDE1234F";
    if (f.aadhaar && !validAadhaar(f.aadhaar)) x.aadhaar = "Aadhaar has 12 digits";
    if (f.uan && !validUan(f.uan)) x.uan = "UAN has 12 digits";
  }
  if (step === 3) {
    if (f.designation.trim().length < 2) x.designation = "Designation is required";
    if (!f.departmentId) x.departmentId = "Pick a department";
    if (!f.managerId && (!editing || hadManager)) x.managerId = "Pick a reporting manager";
    if (!f.doj) x.doj = "Pick the date of joining";
    if (!f.roleId) x.roleId = "Pick a role";
  }
  return x;
}

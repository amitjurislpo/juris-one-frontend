import { stepErrors, type EmployeeInput, type StepErrors } from "@/lib/employee-schema";
import type { NewHireInput } from "./actions";

const FIELDS = ["firstName", "lastName", "email", "phone", "designation", "departmentId", "managerId", "dateOfJoining", "roleId"] as const;

/** The "Onboard employee" dialog asks only these fields of the add-employee form, with the same checks and messages (the father's name is the employee's to fill in). */
export function newHireErrors(form: EmployeeInput): StepErrors {
  const all = { ...stepErrors(1, { ...form, fatherName: "n/a" }, false), ...stepErrors(3, form, false) };
  const errors: StepErrors = {};
  for (const field of FIELDS) if (all[field]) errors[field] = all[field];
  return errors;
}

/** Only what the API takes for a new onboarding. */
export function newHireInput(form: EmployeeInput): NewHireInput {
  const { firstName, lastName, email, phoneCountry, phone, location, shift, dateOfJoining, designation, departmentId, managerId, roleId } = form;
  return { firstName: firstName.trim(), lastName: lastName.trim(), workEmail: email.trim(), phoneCountry, phone, location, shift, dateOfJoining, designation: designation.trim(), departmentId, managerId, roleId };
}

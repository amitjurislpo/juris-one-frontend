import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";
import type { EmployeeInput } from "@/lib/employee-schema";
import type { RejectionRequest } from "./hireReview";

// HR's side of onboarding. Filling the wizard on behalf of an employee goes through `onboardingApiFor({ kind: "hr", employeeId })`.
// See references/ONBOARDING_WIZARD_API.md (v2).
const enc = encodeURIComponent;

/** The minimal master data the "Onboard employee" dialog sends (the first part of the add-employee form). */
export interface NewHireInput {
  firstName: string; lastName: string; workEmail: string; phoneCountry: string; phone: string; location: string; shift: EmployeeInput["shift"];
  dateOfJoining: string; designation: string; departmentId: string; managerId: string; roleId: string;
}

/** Creates the employee with portal access on and onboarding NOT_STARTED, and emails the invitation. */
export function createOnboarding(input: NewHireInput): Promise<ActionResult<{ employeeId: string }>> {
  return apiAction<{ employeeId: string }>("POST", "/api/v1/onboardings", input);
}

export function approveOnboarding(employeeId: string): Promise<ActionResult> {
  return apiAction("POST", `/api/v1/people/${enc(employeeId)}/onboarding/approvals`, {});
}

export function requestOnboardingChanges(employeeId: string, request: RejectionRequest): Promise<ActionResult> {
  return apiAction("POST", `/api/v1/people/${enc(employeeId)}/onboarding/rejections`, request);
}

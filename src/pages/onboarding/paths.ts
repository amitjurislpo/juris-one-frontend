import type { OnboardingTarget } from "./actions";

/** Where HR lands after submitting a hire's onboarding on their behalf (the HR onboarding list). */
const HR_ONBOARDING_LIST_PATH = "/onboarding/hires";

export interface OnboardingPaths {
  /** The wizard. */
  wizard: string;
  /** The Information Summary with "Edit Form" and "Submit Onboarding". */
  summary: string;
  /** Where a successful submission goes: the employee's "Submitted" page, or HR's list. */
  done: string;
}

/** The screens of one onboarding: the employee's own (`/onboarding...`) or HR's on-behalf one (`/onboarding/hires/{employeeId}...`). */
export function onboardingPathsFor(target: OnboardingTarget): OnboardingPaths {
  if (target.kind === "mine") return { wizard: "/onboarding", summary: "/onboarding/summary", done: "/onboarding/success" };
  const wizard = `${HR_ONBOARDING_LIST_PATH}/${encodeURIComponent(target.employeeId)}`;
  return { wizard, summary: `${wizard}/summary`, done: HR_ONBOARDING_LIST_PATH };
}

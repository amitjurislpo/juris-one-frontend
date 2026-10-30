/**
 * The onboarding gate: an employee whose onboarding is required is LOCKED. They see no menu and can only open the onboarding
 * pages (the wizard, or the "waiting for HR" screen) until HR approves. The field the API sends is read in ONE place
 * (`readOnboardingGate`); if the backend names it differently, change only that line.
 */
type OnboardingStatusValue = "NOT_REQUIRED" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";

export interface OnboardingGate { status: OnboardingStatusValue; isRequired: boolean }

/** The statuses that lock the employee out of the portal. NOT_REQUIRED and APPROVED are free. */
const LOCKED_STATUSES: readonly string[] = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "CHANGES_REQUESTED"];

/** Pages a locked employee may open (everything else sends them to /onboarding). */
const ONBOARDING_PATHS: readonly string[] = ["/onboarding", "/onboarding/summary", "/onboarding/success"];

/** Reads `onboarding: { status, isRequired }` from the `/api/v1/me` payload; null when the API sent nothing (everyone unaffected). */
export function readOnboardingGate(mePayload: { onboarding?: { status?: string; isRequired?: boolean } | null }): OnboardingGate | null {
  const raw = mePayload.onboarding;
  if (!raw || !raw.status) return null;
  return { status: raw.status as OnboardingStatusValue, isRequired: raw.isRequired ?? LOCKED_STATUSES.includes(raw.status) };
}

/** True while the employee is locked: the wizard, then HR's review, then (after a rejection) the wizard again. */
export function mustCompleteOnboarding(gate: OnboardingGate | null | undefined): boolean {
  return !!gate && gate.isRequired;
}

/** True when a locked employee may stay on this path. */
export function isOnboardingPath(pathname: string): boolean {
  return ONBOARDING_PATHS.includes(pathname.replace(/\/+$/, "") || "/");
}

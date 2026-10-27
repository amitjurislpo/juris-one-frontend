import type { StepperItem } from "@/components/ui/Stepper";
import type { OnboardingTarget } from "./actions";
import { draftFromView, type OnboardingDraft } from "./draft";
import { STEP_DEFINITIONS } from "./options";
import type { FieldErrors, OnboardingView, ReviewFlag, ReviewSection, StepNumber, StepStatus } from "./types";
import { validateEmployments } from "./validation/employment";
import { validateFamily } from "./validation/family";
import { validateNominations } from "./validation/nominations";
import { validatePersonalStep } from "./validation/personal";
import { validateStatutoryStep } from "./validation/statutory";

export const LAST_STEP: StepNumber = 6;

/**
 * Whether the form can be changed and submitted. The server says (`isReadOnly`); on top of that an employee cannot change their own onboarding
 * while it waits for HR (SUBMITTED) or after approval, whereas HR filling it on their behalf can until it is approved.
 */
export function canEditOnboarding(view: OnboardingView, target: OnboardingTarget): boolean {
  if (view.isReadOnly || view.status === "APPROVED" || view.status === "NOT_REQUIRED") return false;
  return target.kind === "hr" || view.status !== "SUBMITTED";
}

/** Client-side validation of one step (step 6 is gated by its mandatory attachment slots instead, see attachmentSlots.ts). */
export function validateStep(step: StepNumber, draft: OnboardingDraft): FieldErrors {
  switch (step) {
    case 1: return validatePersonalStep(draft.personal);
    case 2: return validateEmployments(draft.employments);
    case 3: return validateStatutoryStep(draft.statutory);
    case 4: return validateFamily(draft.familyMembers);
    case 5: return validateNominations(draft.nominations);
    case 6: return {};
  }
}

/** The step each section HR can flag belongs to (PERSONAL, ADDRESS and QUALIFICATIONS are the three sections of step 1). */
export const REVIEW_SECTION_STEP: Record<ReviewSection, StepNumber> = {
  PERSONAL: 1, ADDRESS: 1, QUALIFICATIONS: 1, EMPLOYMENT: 2, ACCOUNTS: 3, FAMILY: 4, NOMINATIONS: 5, ATTACHMENTS: 6,
};

/** The steps that hold at least one flagged section. */
export function flaggedSteps(flags: ReviewFlag[]): Set<StepNumber> {
  return new Set(flags.map((flag) => REVIEW_SECTION_STEP[flag.section]).filter((step): step is StepNumber => step !== undefined));
}

/** HR's comment per flagged section of one step (empty when nothing in the step is flagged). */
export function flagCommentsForStep(flags: ReviewFlag[], step: StepNumber): Partial<Record<ReviewSection, string>> {
  const comments: Partial<Record<ReviewSection, string>> = {};
  for (const flag of flags) if (REVIEW_SECTION_STEP[flag.section] === step) comments[flag.section] = flag.comment;
  return comments;
}

/** The look of one stepper dot: the active step wins, then a step HR flagged (red), a step with errors or flagged INCOMPLETE by the API, then complete, else not visited. */
export function stepperState(step: StepNumber, activeStep: StepNumber, serverStatus: StepStatus | undefined, hasErrors: boolean, isFlagged = false): StepperItem["state"] {
  if (step === activeStep) return "active";
  if (isFlagged) return "flagged";
  if (hasErrors || serverStatus === "INCOMPLETE") return "incomplete";
  return serverStatus === "COMPLETE" ? "complete" : "unvisited";
}

export function stepperItems(
  activeStep: StepNumber, stepStatus: Record<StepNumber, StepStatus>, errorsByStep: Partial<Record<StepNumber, FieldErrors>>, translate: (text: string) => string,
  flags: ReviewFlag[] = [],
): StepperItem[] {
  const flagged = flaggedSteps(flags);
  return STEP_DEFINITIONS.map(({ step, label, icon }) => ({
    key: step, label: translate(label), icon,
    state: stepperState(step, activeStep, stepStatus[step], Object.keys(errorsByStep[step] ?? {}).length > 0, flagged.has(step)),
    isFlagged: flagged.has(step),
  }));
}

/**
 * After a step was saved the API answers with the whole payload. Only the saved step's part replaces the draft (so server ids and
 * regenerated data win) and the unsaved work on the other steps stays as typed. Saving step 4 also takes the nominations,
 * because the API drops nominees that point at a removed family member.
 */
export function mergeSavedStep(draft: OnboardingDraft, saved: OnboardingView, step: StepNumber): OnboardingDraft {
  const fresh = draftFromView(saved);
  switch (step) {
    case 1: return { ...draft, personal: fresh.personal };
    case 2: return { ...draft, employments: fresh.employments };
    case 3: return { ...draft, statutory: fresh.statutory };
    case 4: return { ...draft, familyMembers: fresh.familyMembers, nominations: fresh.nominations };
    case 5: return { ...draft, nominations: fresh.nominations };
    case 6: return draft;
  }
}

/** Reads `?step=N` (1..6), else the server's current step. */
export function initialStep(searchStep: string | undefined, currentStep: StepNumber): StepNumber {
  const requested = Number(searchStep);
  return Number.isInteger(requested) && requested >= 1 && requested <= LAST_STEP ? (requested as StepNumber) : currentStep;
}

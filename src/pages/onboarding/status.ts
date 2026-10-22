/** Onboarding status → chip class and label. */
export const ONBOARDING_STATUS = {
  INVITED: { className: "info", text: "Link sent" },
  IN_PROGRESS: { className: "info", text: "Filling in" },
  SUBMITTED: { className: "warn", text: "To review" },
  CHANGES_REQUESTED: { className: "neutral", text: "Sent back" },
  VERIFIED: { className: "ok", text: "Verified" },
  ADDED: { className: "ok", text: "Employee added" },
  CANCELLED: { className: "neutral", text: "Cancelled" },
} as const;

export type OnboardingStatus = keyof typeof ONBOARDING_STATUS;

/** Document kinds HR can require (OTHER is always optional). */
export const DOC_KINDS: Record<string, string> = {
  ID_PROOF: "ID proof", ADDRESS_PROOF: "Address proof", PAN: "PAN card", AADHAAR: "Aadhaar card", SALARY_SLIP: "Last 3 salary slips",
  EDUCATION: "Education certificates", RELIEVING_LETTER: "Relieving letter", PHOTO: "Photo",
};
export const DEFAULT_REQUIRED = ["ID_PROOF", "ADDRESS_PROOF", "PAN", "AADHAAR", "SALARY_SLIP"];

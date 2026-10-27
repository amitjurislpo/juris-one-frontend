/** HR's review of a submitted onboarding: the sections HR can mark as incorrect and the "Request changes" request. */
import type { ReviewFlag, ReviewSection } from "../types";

export const REVIEW_SECTIONS: readonly ReviewSection[] = ["PERSONAL", "ADDRESS", "QUALIFICATIONS", "EMPLOYMENT", "ACCOUNTS", "FAMILY", "NOMINATIONS", "ATTACHMENTS"];

/** English labels (translation keys) of the sections. */
export const REVIEW_SECTION_LABEL: Record<ReviewSection, string> = {
  PERSONAL: "Personal Information",
  ADDRESS: "Address",
  QUALIFICATIONS: "Qualifications",
  EMPLOYMENT: "Previous Employment",
  ACCOUNTS: "Accounts & Statutory",
  FAMILY: "Family Details",
  NOMINATIONS: "Nomination Details",
  ATTACHMENTS: "Attachments",
};


/** The sections HR marked as incorrect, with the comment typed so far (a section is flagged when it has an entry, even an empty one). */
export type FlagDraft = Partial<Record<ReviewSection, string>>;

export interface RejectionRequest { comment: string; flags: ReviewFlag[] }

export interface RejectionProblems {
  /** the overall comment is missing */
  comment?: string;
  /** no section was marked */
  flags?: string;
  /** a marked section without its comment */
  sections: Partial<Record<ReviewSection, string>>;
}

export const toggleFlag = (draft: FlagDraft, section: ReviewSection, isFlagged: boolean): FlagDraft => {
  const next = { ...draft };
  if (isFlagged) next[section] = next[section] ?? ""; else delete next[section];
  return next;
};

export const flaggedSections = (draft: FlagDraft): ReviewSection[] => REVIEW_SECTIONS.filter((section) => section in draft);

/** Builds the body of `POST .../onboarding/rejections` in section order, or lists what is missing (messages are translation keys). */
export function buildRejection(comment: string, draft: FlagDraft): { request: RejectionRequest; problems?: undefined } | { request?: undefined; problems: RejectionProblems } {
  const problems: RejectionProblems = { sections: {} };
  const overall = comment.trim();
  if (!overall) problems.comment = "Write a comment for the employee";
  const sections = flaggedSections(draft);
  if (sections.length === 0) problems.flags = "Mark at least one section as incorrect";
  for (const section of sections) if (!(draft[section] ?? "").trim()) problems.sections[section] = "Write what is wrong in this section";
  if (problems.comment || problems.flags || Object.keys(problems.sections).length > 0) return { problems };
  return { request: { comment: overall, flags: sections.map((section) => ({ section, comment: (draft[section] ?? "").trim() })) } };
}


import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import type { OnboardingView, ReviewSection, StepNumber } from "./types";
import { REVIEW_SECTION_STEP } from "./wizardLogic";

const REVIEW_SECTION_LABELS: Record<ReviewSection, string> = {
  PERSONAL: "Personal Information", ADDRESS: "Address", QUALIFICATIONS: "Qualifications", EMPLOYMENT: "Previous Employment",
  ACCOUNTS: "Accounts & Statutory", FAMILY: "Family Details", NOMINATIONS: "Nomination Details", ATTACHMENTS: "Attachments",
};

/**
 * The alert shown while HR has asked for changes (worded for the employee; HR looking at it on the employee's behalf passes `forEmployeeName`): the overall comment and the flagged sections (each opens its step).
 * It stays until the employee submits again. Renders nothing when HR flagged nothing.
 */
export function ReviewBanner({ view, onGoToStep, forEmployeeName }: { view: OnboardingView; onGoToStep?: (step: StepNumber) => void; forEmployeeName?: string }) {
  const t = useT();
  if (view.status !== "CHANGES_REQUESTED" && view.reviewFlags.length === 0) return null;
  // every marked section was corrected and saved: no error any more, only the next step
  if (view.reviewFlags.length === 0) {
    return (
      <div className="notice info" role="status">
        <b><Icon name="check" size={16} /> {forEmployeeName ? t("Every section HR marked is corrected") : t("You corrected every section HR marked")}</b>
        <span>{forEmployeeName ? t("Submit for review, then approve it from the review panel.") : t("Submit your onboarding for review again.")}</span>
      </div>
    );
  }
  return (
    <div className="review-banner" role="alert">
      <b className="review-banner-title"><Icon name="info" size={16} /> {forEmployeeName ? t("HR has asked {name} to correct some information", { name: forEmployeeName }) : t("HR has asked you to correct some information")}</b>
      {view.reviewComment && <p className="review-banner-comment">{view.reviewComment}</p>}
      {view.reviewFlags.length > 0 && (
        <ul className="review-banner-list">
          {view.reviewFlags.map((flag) => (
            <li key={flag.section}>
              {onGoToStep
                ? <button type="button" className="linklike" onClick={() => onGoToStep(REVIEW_SECTION_STEP[flag.section])}>{t(REVIEW_SECTION_LABELS[flag.section])}</button>
                : <b>{t(REVIEW_SECTION_LABELS[flag.section])}</b>}
              {flag.comment && <span>: {flag.comment}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

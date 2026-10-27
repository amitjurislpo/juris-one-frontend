import { useRef, useState } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useRouter } from "@/lib/router";
import { onboardingApiFor, type OnboardingSecrets, type OnboardingTarget } from "./actions";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingSummary } from "./OnboardingSummary";
import { onboardingPathsFor } from "./paths";
import { ReviewBanner } from "./ReviewBanner";
import type { OnboardingView, StepNumber } from "./types";

/**
 * The Information Summary of one onboarding. With `canEdit` it has the edit icons, "Edit Form" and "Submit Onboarding" (which is also the
 * resubmit after HR asked for changes); without it, it is read-only (submitted and waiting for HR, or approved).
 */
export function OnboardingSummaryScreen({ view, target, canEdit }: { view: OnboardingView; target: OnboardingTarget; canEdit: boolean }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const api = onboardingApiFor(target);
  const paths = onboardingPathsFor(target);
  const secretsRequest = useRef<Promise<OnboardingSecrets> | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function openStep(step: StepNumber) {
    await api.rememberCurrentStep(step);
    router.push(paths.wizard);
  }

  // the full values are fetched (and audited by the API) only when someone clicks an eye, then kept for the other eyes
  const revealSecrets = () => {
    secretsRequest.current ??= api.loadSecrets().then((result) => {
      if (!result.ok) { secretsRequest.current = null; toast(result.error, "bad"); throw new Error(result.error); }
      return result.data!;
    });
    return secretsRequest.current;
  };

  async function submit() {
    setIsSubmitting(true);
    const result = await api.submitOnboarding();
    if (result.ok) { router.push(paths.done); return; }
    setIsSubmitting(false);
    setIsConfirming(false);
    toast(result.error, "bad");
  }

  return (
    <div className="col">
      <OnboardingHeader header={view.header} canEditPhoto={canEdit && target.kind === "mine"} title={t("Information Summary")} />
      <ReviewBanner view={view} forEmployeeName={target.kind === "hr" ? view.header.name : undefined} />
      {canEdit && (
        <div className="onboarding-footer">
          <button type="button" className="btn" onClick={() => openStep(1)}>{t("Edit Form")}</button>
          {target.kind === "mine" && <button type="button" className="btn btn-gold" onClick={() => setIsConfirming(true)}>{t("Submit Onboarding")}</button>}
        </div>
      )}
      <OnboardingSummary view={view} secrets={null} loadSecrets={revealSecrets} onEdit={canEdit ? openStep : undefined} attachmentUrl={api.attachmentUrl} />
      {isConfirming && (
        <Modal title={t("Submit")} size="sm" onClose={() => !isSubmitting && setIsConfirming(false)}
          footer={isSubmitting ? undefined : <>
            <button type="button" className="btn" onClick={() => setIsConfirming(false)}>{t("No")}</button>
            <button type="button" className="btn btn-gold" onClick={submit}>{t("Yes")}</button>
          </>}>
          {isSubmitting ? <p className="muted" role="status">{t("Loading...")}</p> : <p>{t("Are you sure you want to submit your onboarding information ?")}</p>}
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { Stepper } from "@/components/ui/Stepper";
import { mergeFieldErrors, snapshotServerErrors, type ServerErrorSnapshot } from "@/lib/fieldErrors";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { refreshData } from "@/lib/query";
import { useRouter } from "@/lib/router";
import { MINE, onboardingApiFor, type OnboardingTarget } from "./actions";
import { canProceedFromAttachments } from "./attachmentSlots";
import { draftFromView, stepRequestBody, type OnboardingDraft } from "./draft";
import { FlaggedSection } from "./FlaggedSection";
import { OnboardingHeader } from "./OnboardingHeader";
import { onboardingPathsFor } from "./paths";
import { ReviewBanner } from "./ReviewBanner";
import { SavingOverlay } from "./SavingOverlay";
import { StepAttachments } from "./steps/StepAttachments";
import { StepEmployment } from "./steps/StepEmployment";
import { StepFamily } from "./steps/StepFamily";
import { StepNominations } from "./steps/StepNominations";
import { StepPersonal } from "./steps/StepPersonal";
import { StepStatutory } from "./steps/StepStatutory";
import type { FieldErrors, OnboardingView, StepNumber } from "./types";
import { flagCommentsForStep, initialStep, LAST_STEP, mergeSavedStep, stepperItems, validateStep } from "./wizardLogic";

/**
 * The six-step onboarding form: stepper, the active step, Back and "Save & Next". `target` says whose onboarding it is: the signed-in
 * employee's own (default), or one HR fills in on the employee's behalf (a banner says so and the shell stays HR's).
 */
export function OnboardingWizard({ view, target = MINE }: { view: OnboardingView; target?: OnboardingTarget }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { searchParams } = usePage();
  const api = onboardingApiFor(target);
  const paths = onboardingPathsFor(target);
  const [step, setStep] = useState<StepNumber>(() => initialStep(searchParams.step, target.kind === "hr" ? 1 : view.currentStep));
  const [draft, setDraft] = useState<OnboardingDraft>(() => draftFromView(view));
  const [errorsByStep, setErrorsByStep] = useState<Partial<Record<StepNumber, FieldErrors>>>({});
  const [serverErrorsByStep, setServerErrorsByStep] = useState<Partial<Record<StepNumber, ServerErrorSnapshot>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const isReadOnly = view.isReadOnly;
  const errors = errorsByStep[step] ?? {};
  const flagComments = flagCommentsForStep(view.reviewFlags, step);

  useEffect(() => { top.current?.scrollIntoView({ block: "start" }); }, [step]);

  // once a step shows errors, every edit checks it again, so a field's message goes as soon as its value is right;
  // a server error stays until its own field is edited
  useEffect(() => {
    setErrorsByStep((current) => {
      const shown = current[step];
      if (!shown || Object.keys(shown).length === 0) return current;
      const found = mergeFieldErrors(validateStep(step, draft), serverErrorsByStep[step] ?? {}, stepRequestBody(step, draft));
      return JSON.stringify(found) === JSON.stringify(shown) ? current : { ...current, [step]: found };
    });
  }, [draft, step, serverErrorsByStep]);

  const changeDraft = (changes: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const goToStep = (destination: StepNumber) => {
    if (destination === step) return;
    setStep(destination);
    if (!isReadOnly) void api.rememberCurrentStep(destination);
  };

  function showErrors(found: FieldErrors) {
    setErrorsByStep((current) => ({ ...current, [step]: found }));
    // focus the first field with a problem once the errors are rendered
    requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
  }

  async function saveAndNext() {
    if (isReadOnly) {
      if (step === LAST_STEP) router.push(paths.summary);
      else setStep((step + 1) as StepNumber);
      return;
    }
    if (step === LAST_STEP && !canProceedFromAttachments(view.attachmentSlots)) return;
    const found = validateStep(step, draft);
    if (Object.keys(found).length > 0) { showErrors(found); return; }
    setIsSaving(true);
    const result = await api.saveStep(step, stepRequestBody(step, draft));
    setIsSaving(false);
    if (!result.ok) {
      if (result.errors && Object.keys(result.errors).length > 0) {
        setServerErrorsByStep((current) => ({ ...current, [step]: snapshotServerErrors(result.errors!, stepRequestBody(step, draft)) }));
        showErrors(result.errors);
      }
      toast(result.error, "bad");
      return;
    }
    setErrorsByStep((current) => ({ ...current, [step]: {} }));
    setServerErrorsByStep((current) => ({ ...current, [step]: {} }));
    if (result.data) setDraft((current) => mergeSavedStep(current, result.data!, step));
    if (step === LAST_STEP) router.push(paths.summary);
    else setStep(result.data?.currentStep ?? ((step + 1) as StepNumber));
  }

  const slotsComplete = canProceedFromAttachments(view.attachmentSlots);
  const isBlocked = step === LAST_STEP && !isReadOnly && !slotsComplete;

  return (
    <div className="onboarding" ref={top}>
      {target.kind === "hr" && <p className="notice" role="status" style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="info" size={15} /> {t("You are filling this onboarding on behalf of {name}", { name: view.header.name })}</p>}
      <OnboardingHeader header={view.header} canEditPhoto={target.kind === "mine" && !isReadOnly} />
      <ReviewBanner view={view} onGoToStep={goToStep} forEmployeeName={target.kind === "hr" ? view.header.name : undefined} />
      {isReadOnly && <p className="muted" role="status">{t("This onboarding can no longer be changed.")}</p>}
      <Stepper label={t("Onboarding steps")} items={stepperItems(step, view.stepStatus, errorsByStep, t, view.reviewFlags)} onSelect={(destination) => goToStep(destination as StepNumber)} />
      <section className="onboarding-step" aria-live="polite">
        {Object.keys(errors).length > 0 && <p className="err" role="alert">{t("Some information is missing or invalid")}</p>}
        {step === 1 && <StepPersonal value={draft.personal} onChange={(personal) => changeDraft({ personal })} errors={errors} isReadOnly={isReadOnly} flagComments={flagComments} />}
        {step === 2 && (
          <FlaggedSection comment={flagComments.EMPLOYMENT}>
            <h3 className="wizard-heading">{t("Previous Employment")}</h3>
            <StepEmployment value={draft.employments} onChange={(employments) => changeDraft({ employments })} errors={errors} isReadOnly={isReadOnly} />
          </FlaggedSection>
        )}
        {step === 3 && (
          <FlaggedSection comment={flagComments.ACCOUNTS}>
            <h3 className="wizard-heading">{t("Identifications")}</h3>
            <StepStatutory value={draft.statutory} onChange={(statutory) => changeDraft({ statutory })} errors={errors} isReadOnly={isReadOnly}
              masked={{ bankAccountNumber: view.bank.bankAccountNumber ?? "", uan: view.statutory.uan ?? "", pan: view.statutory.pan ?? "", aadhaar: view.statutory.aadhaar ?? "" }} />
          </FlaggedSection>
        )}
        {step === 4 && (
          <FlaggedSection comment={flagComments.FAMILY}>
            <StepFamily value={draft.familyMembers} onChange={(familyMembers) => changeDraft({ familyMembers })} errors={errors} isReadOnly={isReadOnly} />
          </FlaggedSection>
        )}
        {step === 5 && (
          <FlaggedSection comment={flagComments.NOMINATIONS}>
            <StepNominations value={draft.nominations} onChange={(nominations) => changeDraft({ nominations })} errors={errors} isReadOnly={isReadOnly} familyMembers={draft.familyMembers} onGoToFamilyDetails={() => goToStep(4)} />
          </FlaggedSection>
        )}
        {step === 6 && (
          <FlaggedSection comment={flagComments.ATTACHMENTS}>
            <StepAttachments slots={view.attachmentSlots} onChanged={() => void refreshData()} isReadOnly={isReadOnly} api={api} />
          </FlaggedSection>
        )}
      </section>
      <footer className="onboarding-footer">
        <button type="button" className="btn" disabled={step === 1} onClick={() => goToStep((step - 1) as StepNumber)}>{t("Back")}</button>
        <button type="button" className="btn btn-gold" disabled={isBlocked || isSaving} onClick={() => void saveAndNext()}>{isReadOnly ? t("Next") : t("Save & Next")}</button>
        {isBlocked && <span className="err onboarding-blocked" role="status"><Icon name="info" size={15} /> {t("Complete mandatory information")}</span>}
      </footer>
      {isSaving && <SavingOverlay />}
    </div>
  );
}

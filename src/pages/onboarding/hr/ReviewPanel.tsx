import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { INDIA_TIME_ZONE, formatDayMonthYear, isoDateIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useRouter } from "@/lib/router";
import { usePage } from "@/lib/page";
import { OnboardingStatusChip } from "@/pages/employees/OnboardingStatusChip";
import type { OnboardingApi } from "../actions";
import { OnboardingSummary } from "../OnboardingSummary";
import type { OnboardingView } from "../types";
import { approveOnboarding, requestOnboardingChanges } from "./actions";
import { buildRejection, REVIEW_SECTION_LABEL, REVIEW_SECTIONS, toggleFlag, type FlagDraft, type RejectionProblems } from "./hireReview";

/** Asks HR to confirm, then approves: the employee gets the full portal. Used by the panel and by the Summary window. */
function ApproveConfirm({ employeeId, name, onClose, onError }: { employeeId: string; name: string; onClose: () => void; onError: (message: string) => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [isBusy, start] = useTransition();
  const approve = () => start(async () => {
    const result = await approveOnboarding(employeeId);
    onClose();
    if (result.ok) { toast(result.message ?? t("Onboarding approved")); router.push("/employees"); } else onError(result.error);
  });
  return (
    <ConfirmDialog title={t("Approve onboarding")} confirm={t("Approve")} busy={isBusy} onClose={onClose} onConfirm={approve}
      body={t("{name} will get full access to the portal.", { name })} />
  );
}

/** The employee's Summary in a window (masked values, files to open or download); for a submitted onboarding HR can approve from here after reading it. */
function SummaryDialog({ employeeId, view, api, onClose }: { employeeId: string; view: OnboardingView; api: OnboardingApi; onClose: () => void }) {
  const t = useT();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState("");
  const canDecide = view.status === "SUBMITTED";
  const footer = canDecide ? (
    <>
      {error && <span className="err" role="alert" style={{ marginRight: "auto" }}>{error}</span>}
      <button type="button" className="btn" onClick={onClose}>{t("Request changes instead")}</button>
      <button type="button" className="btn btn-gold" onClick={() => { setError(""); setIsApproving(true); }}>{t("Approve")}</button>
    </>
  ) : undefined;
  return (
    <Modal title={`${t("Information Summary")} · ${view.header.name}`} maxWidth={1100} onClose={onClose} footer={footer}>
      <OnboardingSummary view={view} secrets={null} attachmentUrl={api.attachmentUrl} />
      {isApproving && <ApproveConfirm employeeId={employeeId} name={view.header.name} onClose={() => setIsApproving(false)} onError={setError} />}
    </Modal>
  );
}

/** What HR marked last time, shown to HR while the employee fixes it. */
function PreviousReview({ view }: { view: OnboardingView }) {
  const t = useT();
  const flags = view.reviewFlags;
  if (!view.reviewComment && flags.length === 0) return null;
  return (
    <div className="review-previous" role="status">
      <b>{t("Changes requested from the employee")}</b>
      {view.reviewComment && <p>{view.reviewComment}</p>}
      {flags.map((flag) => (
        <p key={flag.section} className="review-flag"><b>{t(REVIEW_SECTION_LABEL[flag.section])}</b>: {flag.comment}</p>
      ))}
    </div>
  );
}

/** Decision area for a SUBMITTED onboarding: mark sections as incorrect, then "Request changes", or "Approve". */
function DecisionControls({ employeeId, name }: { employeeId: string; name: string }) {
  const t = useT();
  const toast = useToast();
  const [draft, setDraft] = useState<FlagDraft>({});
  const [comment, setComment] = useState("");
  const [isTried, setIsTried] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isBusy, start] = useTransition();

  // once "Request changes" was pressed the form is checked on every edit, so each message goes as soon as its own field is right
  const problems: RejectionProblems | null = isTried ? buildRejection(comment, draft).problems ?? null : null;
  const change = (next: FlagDraft) => { setDraft(next); setServerError(""); };

  const requestChanges = () => {
    const built = buildRejection(comment, draft);
    setIsTried(true);
    if (built.problems) return;
    start(async () => {
      const result = await requestOnboardingChanges(employeeId, built.request);
      if (result.ok) toast(result.message ?? t("Changes requested from {name}", { name })); else setServerError(result.error);
    });
  };
  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("Check the Summary. If something is wrong, mark that section as incorrect and say what to fix; otherwise approve.")}</p>
      {REVIEW_SECTIONS.map((section) => {
        const isFlagged = section in draft;
        const sectionProblem = problems?.sections[section];
        const sectionName = t(REVIEW_SECTION_LABEL[section]);
        return (
          <div key={section} className={`review-section${isFlagged ? " flagged" : ""}`}>
            <div className="review-section-head">
              <b>{sectionName}</b>
              <label className="review-mark"><input type="checkbox" checked={isFlagged} onChange={(e) => change(toggleFlag(draft, section, e.target.checked))} aria-label={t("Mark {section} as incorrect", { section: sectionName })} />{t("Mark as incorrect")}</label>
            </div>
            {isFlagged && (
              <label className="field">
                <span className="sr-only">{t("Comment for {section}", { section: sectionName })}</span>
                <textarea value={draft[section] ?? ""} maxLength={500} placeholder={t("What is wrong in this section?")} aria-invalid={!!sectionProblem}
                  onChange={(e) => change({ ...draft, [section]: e.target.value })} />
                {sectionProblem && <span className="err">{t(sectionProblem)}</span>}
              </label>
            )}
          </div>
        );
      })}
      {problems?.flags && <span className="err" role="alert">{t(problems.flags)}</span>}
      <label className="field">{t("Comment for the employee")}
        <textarea value={comment} maxLength={1000} placeholder={t("Summarise what the employee must correct")} aria-invalid={!!problems?.comment}
          onChange={(e) => { setComment(e.target.value); setServerError(""); }} />
        {problems?.comment && <span className="err">{t(problems.comment)}</span>}
      </label>
      {serverError && <div className="err" role="alert">{serverError}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-gold" disabled={isBusy} onClick={() => setIsApproving(true)}>{t("Approve")}</button>
        <button type="button" className="btn btn-danger" disabled={isBusy} onClick={requestChanges}>{t("Request changes")}</button>
      </div>
      {isApproving && <ApproveConfirm employeeId={employeeId} name={name} onClose={() => setIsApproving(false)} onError={setServerError} />}
    </div>
  );
}

/** Submits the onboarding for review on the employee's behalf; the API's list of what is missing is shown as is. */
function SubmitControls({ api }: { api: OnboardingApi }) {
  const t = useT();
  const toast = useToast();
  const [problems, setProblems] = useState<string[]>([]);
  const [isBusy, start] = useTransition();
  const submit = () => start(async () => {
    const result = await api.submitOnboarding();
    if (result.ok) { setProblems([]); toast(result.message ?? t("Onboarding submitted for review")); return; }
    setProblems(result.errors ? Object.values(result.errors) : [result.error]);
  });
  return (
    <div className="col" style={{ gap: 10 }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("Fill in the steps, then submit for review. After that you can approve it here.")}</p>
      <button type="button" className="btn btn-gold" disabled={isBusy} onClick={submit}>{t("Submit for review")}</button>
      {problems.length > 0 && <ul className="err" role="alert" style={{ margin: 0, paddingLeft: 18 }}>{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
    </div>
  );
}

/** HR's panel beside the employee's wizard: status, the Summary and, for a submitted onboarding, the decision. */
export function ReviewPanel({ employeeId, view, api }: { employeeId: string; view: OnboardingView; api: OnboardingApi }) {
  const t = useT();
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const { user } = usePage();
  const day = (instant: string) => formatDayMonthYear(isoDateIn(instant, user.timeZone ?? INDIA_TIME_ZONE));
  return (
    <aside className="review-panel card pad" aria-label={t("HR review")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div><span className="eyebrow">{t("HR review")}</span><h3 style={{ margin: "2px 0 0", fontSize: 16 }}>{view.header.name}</h3></div>
        <OnboardingStatusChip status={view.status} />
      </div>
      {view.submittedAt && <span className="muted" style={{ fontSize: 13 }}>{t("Submitted on {date}", { date: day(view.submittedAt) })}</span>}
      {view.status === "APPROVED" && <span className="muted" style={{ fontSize: 13 }}>{view.approvedAt ? t("Approved on {date}", { date: day(view.approvedAt) }) : t("Approved")}</span>}
      <button type="button" className="btn" onClick={() => setIsSummaryOpen(true)}>{t("Open Summary")}</button>
      {view.status === "CHANGES_REQUESTED" && <PreviousReview view={view} />}
      {view.status === "SUBMITTED" && <DecisionControls employeeId={employeeId} name={view.header.name} />}
      {view.status === "CHANGES_REQUESTED" && <p className="notice info" role="status">{t("Waiting for {name} to correct the marked sections. You can also correct them here and submit for review.", { name: view.header.name })}</p>}
      {(view.status === "NOT_STARTED" || view.status === "IN_PROGRESS" || view.status === "CHANGES_REQUESTED") && <SubmitControls api={api} />}
      {isSummaryOpen && <SummaryDialog employeeId={employeeId} view={view} api={api} onClose={() => setIsSummaryOpen(false)} />}
    </aside>
  );
}

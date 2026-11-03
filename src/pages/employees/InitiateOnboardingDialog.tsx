import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { initiateOnboarding, type FilledBy, type InitiationResult } from "./actions";

/**
 * "Initiate onboarding" for the selected employees: the employee fills the wizard (the link is emailed) or HR fills it on their behalf (no email).
 * Employees that cannot be initiated (already submitted or approved, past employees) are listed with the reason; the rest go through.
 */
export function InitiateOnboardingDialog({ people, onClose, onDone }: { people: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const [filledBy, setFilledBy] = useState<FilledBy>("EMPLOYEE");
  const [error, setError] = useState("");
  const [result, setResult] = useState<InitiationResult | null>(null);
  const [isBusy, start] = useTransition();
  const nameOf = (employeeId: string) => people.find((person) => person.id === employeeId)?.name ?? employeeId;
  const refused = result?.outcomes.filter((outcome) => !outcome.isInitiated) ?? [];

  const submit = () => start(async () => {
    setError("");
    const response = await initiateOnboarding(people.map((person) => person.id), filledBy);
    if (!response.ok) { setError(response.error); return; }
    const outcome = response.data!;
    setResult(outcome);
    toast(filledBy === "EMPLOYEE" ? t("Onboarding link sent to {n} employee(s)", { n: outcome.initiated }) : t("Onboarding started for {n} employee(s) - fill it from their profile", { n: outcome.initiated }), outcome.initiated ? "ok" : "bad");
    if (!outcome.refused) { onDone(); onClose(); }
  });

  return (
    <Modal title={t("Initiate onboarding")} eyebrow={t("{n} selected", { n: people.length })} onClose={result ? () => { onDone(); onClose(); } : onClose} size="sm"
      footer={result
        ? <button className="btn btn-gold" onClick={() => { onDone(); onClose(); }}>{t("Done")}</button>
        : <>
          <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
          <button className="btn btn-gold" disabled={isBusy} onClick={submit}>{isBusy ? t("Saving…") : filledBy === "EMPLOYEE" ? t("Send onboarding link") : t("Start onboarding")}</button>
        </>}>
      {!result && (
        <div className="col" style={{ gap: 14 }}>
          <fieldset className="col" style={{ gap: 10, border: 0, padding: 0, margin: 0 }}>
            <legend className="eyebrow">{t("Who fills the form?")}</legend>
            <label className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <input type="radio" name="filledBy" checked={filledBy === "EMPLOYEE"} onChange={() => setFilledBy("EMPLOYEE")} style={{ marginTop: 4 }} />
              <span><b>{t("The employee fills it")}</b><br /><span className="muted" style={{ fontSize: 13 }}>{t("They get an email with the link. You review it after they submit.")}</span></span>
            </label>
            <label className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <input type="radio" name="filledBy" checked={filledBy === "HR"} onChange={() => setFilledBy("HR")} style={{ marginTop: 4 }} />
              <span><b>{t("HR fills it for the employee")}</b><br /><span className="muted" style={{ fontSize: 13 }}>{t("No email is sent. Open each employee and use Complete onboarding.")}</span></span>
            </label>
          </fieldset>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("Until the onboarding is approved, the employee can open only the onboarding page.")}</p>
          {error && <div className="err" role="alert">{error}</div>}
        </div>
      )}
      {result && (
        <div className="col" style={{ gap: 10 }}>
          <p style={{ margin: 0 }}>{t("{n} started", { n: result.initiated })}{refused.length ? ` · ${t("{n} could not be started", { n: refused.length })}` : ""}</p>
          {refused.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {refused.map((outcome) => <li key={outcome.employeeId}><b>{nameOf(outcome.employeeId)}</b>: {t(outcome.reason ?? "")}</li>)}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

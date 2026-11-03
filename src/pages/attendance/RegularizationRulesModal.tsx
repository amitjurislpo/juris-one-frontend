import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { addRegularizationReason, saveRegularizationRules, updateRegularizationReason } from "./actions";
import type { RegularizationRules } from "./regularization";

/** Admin / HR: the rules (back-date limit, monthly limit, attachment) and the reason list. */
export function RegularizationRulesModal({ rules, onClose }: { rules: RegularizationRules; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [backDateLimitDays, setBackDateLimitDays] = useState(String(rules.backDateLimitDays));
  const [monthlyLimit, setMonthlyLimit] = useState(String(rules.monthlyLimit));
  const [attachmentMandatory, setAttachmentMandatory] = useState(rules.attachmentMandatory);
  const [autoApprove, setAutoApprove] = useState(rules.autoApprove);
  const [newLabel, setNewLabel] = useState("");
  const [newNeedsDescription, setNewNeedsDescription] = useState(false);
  const report = (result: { ok: boolean; message?: string; error?: string }) => toast(result.ok ? result.message! : result.error!, result.ok ? "ok" : "bad");

  return (
    <Modal title={t("Regularization settings")} eyebrow={t("Attendance")} size="sm" onClose={onClose}
      footer={<><span></span><div className="row" style={{ gap: 10 }}>
        <button className="btn btn-ghost" onClick={onClose}>{t("Close")}</button>
        <button className="btn btn-gold" disabled={busy} onClick={() => start(async () => report(await saveRegularizationRules({ backDateLimitDays: Number(backDateLimitDays), monthlyLimit: Number(monthlyLimit), attachmentMandatory, autoApprove })))}>{t("Save rules")}</button>
      </div></>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid2">
          <label className="field">{t("Back-date limit (days)")}<input type="number" min={0} max={365} value={backDateLimitDays} onChange={(e) => setBackDateLimitDays(e.target.value)} /></label>
          <label className="field">{t("Requests per month")}<input type="number" min={1} max={1000} value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} /></label>
        </div>
        <label className="row" style={{ gap: 8, alignItems: "center" }}><input type="checkbox" checked={attachmentMandatory} onChange={(e) => setAttachmentMandatory(e.target.checked)} />{t("An attachment is mandatory")}</label>
        <label className="row" style={{ gap: 8, alignItems: "flex-start" }}><input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />{t("Approve at once the requests that Admin or HR raise for an employee")}</label>
        <div>
          <b style={{ fontSize: 14 }}>{t("Reasons")}</b>
          <div className="col" style={{ gap: 6, marginTop: 8 }}>
            {rules.reasons.map((reason) => (
              <div className="row" key={reason.id} style={{ gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ opacity: reason.active ? 1 : 0.5 }}>{reason.label}{reason.requiresDescription ? ` · ${t("needs a description")}` : ""}</span>
                <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => start(async () => report(await updateRegularizationReason(reason.id, { active: !reason.active })))}>{reason.active ? t("Turn off") : t("Turn on")}</button>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 10, alignItems: "flex-end" }}>
            <label className="field" style={{ flex: 1 }}>{t("New reason")}<input value={newLabel} maxLength={80} onChange={(e) => setNewLabel(e.target.value)} /></label>
            <label className="row" style={{ gap: 6, alignItems: "center" }}><input type="checkbox" checked={newNeedsDescription} onChange={(e) => setNewNeedsDescription(e.target.checked)} />{t("Needs a description")}</label>
            <button className="btn btn-sm" disabled={busy || !newLabel.trim()} onClick={() => start(async () => {
              const result = await addRegularizationReason({ label: newLabel.trim(), requiresDescription: newNeedsDescription });
              report(result);
              if (result.ok) { setNewLabel(""); setNewNeedsDescription(false); }
            })}>{t("Add")}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

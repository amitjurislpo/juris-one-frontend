import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { formatDateTime, formatWeekdayDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { cancelOnDuty, decideOnDutyRequests } from "./actions";
import { partLabel, type OnDutyItem } from "./onDuty";
import { STATUS_CHIP, STATUS_LABEL } from "./regularization";

/** One On Duty request in full. The owner can withdraw it while pending; Admin / HR can decide it (never their own). */
export function OnDutyDetailsModal({ item, canDecide, onClose }: { item: OnDutyItem; canDecide: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { user } = usePage();
  const readOnly = useReadOnly();
  const [busy, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const pending = item.status === "PENDING";
  const isOwn = item.employeeId === user.id;
  const time = (iso: string | null) => (iso ? formatDateTime(new Date(iso), user.timeZone) : "—");

  const decide = (approve: boolean) => start(async () => {
    const result = await decideOnDutyRequests({ ids: [item.id], approve, note: note.trim() || undefined });
    const first = result.ok ? result.data?.[0] : undefined;
    const ok = result.ok && first?.ok === true;
    toast(ok ? first.message : result.ok ? first?.message ?? "" : result.error, ok && approve ? "ok" : "bad");
    setRejecting(false);
    if (ok) onClose();
  });

  return (
    <Modal title={t("On Duty")} eyebrow={formatWeekdayDayMonthYear(item.date)} size="sm" onClose={onClose}
      footer={<>
        <span className={`chip ${STATUS_CHIP[item.status] ?? "neutral"}`}>{t(STATUS_LABEL[item.status] ?? item.status)}</span>
        <div className="row" style={{ gap: 10 }}>
          {pending && isOwn && !readOnly && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => start(async () => { const result = await cancelOnDuty(item.id); toast(result.ok ? result.message! : result.error, result.ok ? "ok" : "bad"); if (result.ok) onClose(); })}>{t("Withdraw request")}</button>
          )}
          {pending && canDecide && !isOwn && !readOnly && <>
            <button className="btn btn-danger" disabled={busy} onClick={() => setRejecting(true)}>{t("Reject")}</button>
            <button className="btn btn-gold" disabled={busy} onClick={() => decide(true)}>{t("Approve")}</button>
          </>}
        </div>
      </>}>
      <div className="col" style={{ gap: 4 }}>
        <div className="kv"><span className="muted">{t("Employee")}</span><b>{item.employeeName} <span className="faint">{item.employeeCode}</span></b></div>
        <div className="kv"><span className="muted">{t("Duration")}</span><b>{t(partLabel(item.part))}</b></div>
        <div className="kv"><span className="muted">{t("Place")}</span><b>{item.location ?? "—"}</b></div>
        <div className="kv"><span className="muted">{t("Reason")}</span><b>{item.reason}</b></div>
        <div className="kv"><span className="muted">{t("Requested on")}</span><b className="num">{time(item.createdAt)}</b></div>
        {item.decidedAt && <div className="kv"><span className="muted">{item.status === "APPROVED" ? t("Approved by") : t("Rejected by")}</span><b>{item.decidedBy ?? "—"} · {time(item.decidedAt)}</b></div>}
        {item.decisionNote && <div className="kv"><span className="muted">{t("Remarks")}</span><b>{item.decisionNote}</b></div>}
      </div>
      {rejecting && (
        <ConfirmDialog title={t("Reject request")} danger confirm={t("Reject")} busy={busy || !note.trim()} onClose={() => setRejecting(false)} onConfirm={() => decide(false)}
          body={t("Tell {who} why. They will see these remarks.", { who: item.employeeName })}>
          <label className="field" style={{ marginTop: 14 }}>{t("Remarks")} *<input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></label>
        </ConfirmDialog>
      )}
    </Modal>
  );
}

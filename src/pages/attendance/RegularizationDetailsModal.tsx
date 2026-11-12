import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { formatDateTime, formatWeekdayDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { cancelRegularization, decideRegularizations } from "./actions";
import { RegularizationRequestModal } from "./RegularizationRequestModal";
import { canEditRequest } from "./requestKinds";
import { DAY_STATUS_LABEL, formatMinutes, KIND_LABEL, STATUS_CHIP, STATUS_LABEL, type RegularizationItem } from "./regularization";

/** One request in full: what was asked, Old and New, the reason, the attachment and the decision. The owner can withdraw it, and whoever raised it can change it, while pending; whoever the approval rule names can decide it. */
export function RegularizationDetailsModal({ item, canDecide, onClose }: { item: RegularizationItem; canDecide: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { user } = usePage();
  const readOnly = useReadOnly();
  const [busy, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [changing, setChanging] = useState(false);
  const pending = item.status === "PENDING";
  const isOwn = item.employeeId === user.id;
  const time = (iso: string | null) => (iso ? formatDateTime(new Date(iso), user.timeZone) : "—");
  const status = (value: string | null) => (value ? t(DAY_STATUS_LABEL[value] ?? value) : "—");

  const decide = (approve: boolean) => start(async () => {
    const result = await decideRegularizations({ ids: [item.id], approve, note: note.trim() || undefined });
    const first = result.ok ? result.data?.[0] : undefined;
    const ok = result.ok && first?.ok === true;
    toast(ok ? first.message : result.ok ? first?.message ?? "" : result.error, ok && approve ? "ok" : "bad");
    setRejecting(false);
    if (ok) onClose();
  });

  return (
    <Modal title={t(KIND_LABEL[item.kind] ?? item.kind)} eyebrow={formatWeekdayDayMonthYear(item.date)} size="sm" onClose={onClose}
      footer={<>
        <span className={`chip ${STATUS_CHIP[item.status] ?? "neutral"}`}>{t(STATUS_LABEL[item.status] ?? item.status)}</span>
        <div className="row" style={{ gap: 10 }}>
          {canEditRequest(item, user.id, readOnly) && <button className="btn btn-ghost" disabled={busy} onClick={() => setChanging(true)}>{t("Change request")}</button>}
          {pending && isOwn && !readOnly && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => start(async () => { const result = await cancelRegularization(item.id); toast(result.ok ? result.message! : result.error, result.ok ? "ok" : "bad"); if (result.ok) onClose(); })}>{t("Withdraw request")}</button>
          )}
          {pending && canDecide && !readOnly && <>
            <button className="btn btn-danger" disabled={busy} onClick={() => setRejecting(true)}>{t("Reject")}</button>
            <button className="btn btn-gold" disabled={busy} onClick={() => decide(true)}>{t("Approve")}</button>
          </>}
        </div>
      </>}>
      <div className="col" style={{ gap: 4 }}>
        <div className="kv"><span className="muted">{t("Employee")}</span><b>{item.employeeName} <span className="faint">{item.employeeCode}</span></b></div>
        <div className="kv"><span className="muted">{t("Requested check-in")}</span><b className="num">{time(item.checkIn)}</b></div>
        <div className="kv"><span className="muted">{t("Requested check-out")}</span><b className="num">{time(item.checkOut)}</b></div>
        <div className="kv"><span className="muted">{t("Hours (old → new)")}</span><b className="num">{formatMinutes(item.oldMinutes)} → {formatMinutes(item.newMinutes)}</b></div>
        <div className="kv"><span className="muted">{t("Status (old → new)")}</span><b>{status(item.oldStatus)} → {status(item.newStatus)}</b></div>
        <div className="kv"><span className="muted">{t("Reason")}</span><b>{item.reason ?? "—"}</b></div>
        {item.description && <div className="kv"><span className="muted">{t("Description")}</span><b>{item.description}</b></div>}
        {item.hasAttachment && <div className="kv"><span className="muted">{t("Attachment")}</span><a href={`/api/v1/attendance/regularizations/${item.id}/attachment`} target="_blank" rel="noreferrer">{item.attachmentName}</a></div>}
        <div className="kv"><span className="muted">{t("Requested on")}</span><b className="num">{time(item.createdAt)}</b></div>
        {item.decidedAt && <div className="kv"><span className="muted">{item.status === "APPROVED" ? t("Approved by") : t("Rejected by")}</span><b>{item.decidedBy ?? "—"} · {time(item.decidedAt)}</b></div>}
        {item.decisionNote && <div className="kv"><span className="muted">{t("Remarks")}</span><b>{item.decisionNote}</b></div>}
      </div>
      {changing && <RegularizationRequestModal date={item.date} editing={item} onClose={() => { setChanging(false); onClose(); }} />}
      {rejecting && (
        <ConfirmDialog title={t("Reject request")} danger confirm={t("Reject")} busy={busy || !note.trim()} onClose={() => setRejecting(false)} onConfirm={() => decide(false)}
          body={t("Tell {who} why. They will see these remarks.", { who: item.employeeName })}>
          <label className="field" style={{ marginTop: 14 }}>{t("Remarks")} *<input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></label>
        </ConfirmDialog>
      )}
    </Modal>
  );
}

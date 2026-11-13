import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { formatDateTime, formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { cancelRemoteWork, decideRemoteWork } from "./actions";
import { STATUS_CHIP, STATUS_LABEL } from "./regularization";
import { canEditRequest } from "./requestKinds";
import { RemoteWorkRequestModal } from "./RemoteWorkRequestModal";
import { REMOTE_WORK_MAX_NOTE, remoteWorkDuration, type RemoteWorkItem } from "./remoteWork";

/** One remote work request in full. The owner can withdraw it, and whoever raised it can change it, while pending; whoever the approval rule names can approve or reject it (a rejection needs remarks). */
export function RemoteWorkDetailsModal({ item, canDecide, onClose }: { item: RemoteWorkItem; canDecide: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { user } = usePage();
  const readOnly = useReadOnly();
  const [busy, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [changing, setChanging] = useState(false);
  const isOwn = item.employeeId === user.id;
  const time = (iso: string | null) => (iso ? formatDateTime(new Date(iso), user.timeZone) : "—");

  const decide = (approve: boolean) => start(async () => {
    const result = await decideRemoteWork({ ids: [item.id], approve, note: note.trim() || undefined });
    const first = result.ok ? result.data?.[0] : undefined;
    const ok = result.ok && first?.ok === true;
    toast(ok ? first.message : result.ok ? first?.message ?? "" : result.error, ok ? "ok" : "bad");
    setRejecting(false);
    if (ok) onClose();
  });

  return (
    <Modal title={t("Remote work request")} eyebrow={item.fromDate === item.toDate ? formatDayMonthYear(item.fromDate) : `${formatDayMonthYear(item.fromDate)} – ${formatDayMonthYear(item.toDate)}`} size="sm" onClose={onClose}
      footer={<>
        <span className={`chip ${STATUS_CHIP[item.status] ?? "neutral"}`}>{t(STATUS_LABEL[item.status] ?? item.status)}</span>
        <div className="row" style={{ gap: 10 }}>
          {canEditRequest(item, user.id, readOnly) && <button className="btn btn-ghost" disabled={busy} onClick={() => setChanging(true)}>{t("Change request")}</button>}
          {item.status === "PENDING" && isOwn && !readOnly && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => start(async () => { const result = await cancelRemoteWork(item.id); toast(result.ok ? result.message! : result.error, result.ok ? "ok" : "bad"); if (result.ok) onClose(); })}>{t("Withdraw request")}</button>
          )}
          {item.status === "PENDING" && canDecide && !readOnly && <>
            <button className="btn btn-danger" disabled={busy} onClick={() => setRejecting(true)}>{t("Reject")}</button>
            <button className="btn btn-gold" disabled={busy} onClick={() => decide(true)}>{t("Approve")}</button>
          </>}
        </div>
      </>}>
      <div className="col" style={{ gap: 4 }}>
        <div className="kv"><span className="muted">{t("Employee")}</span><b>{item.employeeName} <span className="faint">{item.employeeCode}</span></b></div>
        <div className="kv"><span className="muted">{t("Period")}</span><b className="num">{formatDayMonthYear(item.fromDate)} – {formatDayMonthYear(item.toDate)}</b></div>
        <div className="kv"><span className="muted">{t("Duration")}</span><b className="num">{t(remoteWorkDuration(item), { n: item.days })}</b></div>
        <div className="kv"><span className="muted">{t("Reason")}</span><b>{item.reason}</b></div>
        <div className="kv"><span className="muted">{t("Requested on")}</span><b className="num">{time(item.createdAt)}</b></div>
        {item.decidedAt && <div className="kv"><span className="muted">{item.status === "APPROVED" ? t("Approved by") : t("Rejected by")}</span><b>{item.decidedBy ?? "—"} · {time(item.decidedAt)}</b></div>}
        {item.decisionNote && <div className="kv"><span className="muted">{t("Remarks")}</span><b>{item.decisionNote}</b></div>}
      </div>
      {changing && <RemoteWorkRequestModal editing={item} onClose={() => { setChanging(false); onClose(); }} />}
      {rejecting && (
        <ConfirmDialog title={t("Reject request")} danger confirm={t("Reject")} busy={busy || !note.trim()} onClose={() => setRejecting(false)} onConfirm={() => decide(false)}
          body={t("Tell {who} why. They will see these remarks.", { who: item.employeeName })}>
          <label className="field" style={{ marginTop: 14 }}>{t("Remarks")} *<input value={note} maxLength={REMOTE_WORK_MAX_NOTE} onChange={(e) => setNote(e.target.value)} /></label>
        </ConfirmDialog>
      )}
    </Modal>
  );
}

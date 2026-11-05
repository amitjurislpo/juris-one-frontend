import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { todayIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { requestRemoteWork } from "./actions";
import { REMOTE_WORK_MAX_REASON, remoteWorkDays, remoteWorkProblem, REMOTE_WORK_MAX_DAYS } from "./remoteWork";

/** The Add request form of the Remote Work Requests tab: the first and the last day (one day by default) and a reason. The server checks everything again. */
export function RemoteWorkRequestModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { user } = usePage();
  const [busy, start] = useTransition();
  const today = todayIn(user.timeZone);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const missing = remoteWorkProblem(fromDate, toDate, reason);
  const days = fromDate && toDate && toDate >= fromDate ? remoteWorkDays(fromDate, toDate) : 0;

  const submit = () => start(async () => {
    const result = await requestRemoteWork({ fromDate, toDate, reason: reason.trim() });
    if (!result.ok) { setProblem(result.error); return; }
    toast(result.message!);
    onClose();
  });

  return (
    <Modal title={t("Request remote work")} eyebrow={t("Attendance")} size="sm" onClose={onClose}
      footer={<>
        <span className="faint" style={{ fontSize: 12.5 }}>{t("Goes to Admin and HR — either can approve.")}</span>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
          <button className="btn btn-gold" disabled={busy || !!missing} onClick={submit}>{busy ? t("Sending…") : t("Send for approval")}</button>
        </div>
      </>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid2">
          <label className="field">{t("From")} *
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); if (e.target.value && toDate < e.target.value) setToDate(e.target.value); setProblem(null); }} />
          </label>
          <label className="field">{t("To")} *
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setProblem(null); }} />
          </label>
        </div>
        <div className="kv"><span className="muted">{t("Duration")}</span><b className="num">{days > 0 ? (days === 1 ? t("1 day") : t("{n} days", { n: days })) : "—"}</b></div>
        <label className="field">{t("Reason")} *
          <textarea value={reason} maxLength={REMOTE_WORK_MAX_REASON} onChange={(e) => { setReason(e.target.value); setProblem(null); }} placeholder={t("e.g. Internet repair at home")} />
        </label>
        <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("An approved remote work day counts as a normal working day, even without a check-in.")}</p>
        {problem && <p className="chip bad" role="alert" style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal", margin: 0 }}>{t(problem)}</p>}
        {!problem && missing && (reason || fromDate !== today || toDate !== today) ? <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t(missing, { days: REMOTE_WORK_MAX_DAYS })}</p> : null}
      </div>
    </Modal>
  );
}

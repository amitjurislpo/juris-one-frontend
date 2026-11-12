import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { todayIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { editRemoteWork, requestRemoteWork } from "./actions";
import { EmployeePicker, type PickedEmployee } from "./EmployeePicker";
import { PART_LABEL, type OnDutyPart } from "./onDuty";
import { onBehalfOf } from "./requestKinds";
import { REMOTE_WORK_MAX_DAYS, REMOTE_WORK_MAX_REASON, remoteWorkDays, remoteWorkProblem, type RemoteWorkItem } from "./remoteWork";

/**
 * The Add request form of the Remote Work Requests tab: the first and the last day (one day by default), for a single day the whole day or one half,
 * and a reason. The server checks everything again. With `editing` it changes a pending request instead (no employee).
 */
export function RemoteWorkRequestModal({ onClose, editing }: { onClose: () => void; editing?: RemoteWorkItem }) {
  const t = useT();
  const toast = useToast();
  const { user } = usePage();
  const [busy, start] = useTransition();
  const today = todayIn(user.timeZone);
  const [employee, setEmployee] = useState<PickedEmployee | null>(null);
  const [fromDate, setFromDate] = useState(editing?.fromDate ?? today);
  const [toDate, setToDate] = useState(editing?.toDate ?? today);
  const [part, setPart] = useState<OnDutyPart>((editing?.part as OnDutyPart | undefined) ?? "FULL");
  const [reason, setReason] = useState(editing?.reason ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  const missing = remoteWorkProblem(fromDate, toDate, reason);
  const days = fromDate && toDate && toDate >= fromDate ? remoteWorkDays(fromDate, toDate) : 0;
  const isSingleDay = fromDate !== "" && fromDate === toDate;
  const sentPart = isSingleDay ? part : "FULL"; // a half day is a single day

  const submit = () => start(async () => {
    const result = editing
      ? await editRemoteWork(editing.id, { fromDate, toDate, reason: reason.trim(), part: sentPart })
      : await requestRemoteWork({ ...onBehalfOf(employee?.id), fromDate, toDate, reason: reason.trim(), part: sentPart });
    if (!result.ok) { setProblem(result.error); return; }
    toast(result.message!);
    onClose();
  });

  return (
    <Modal title={editing ? t("Change remote work request") : t("Request remote work")} eyebrow={t("Attendance")} size="sm" onClose={onClose}
      footer={<>
        <span className="faint" style={{ fontSize: 12.5 }}>{editing ? t("It stays pending; the approvers see the new details.") : employee ? t("Approved at once if the business setting is on, else it waits for an approver.") : t("Goes to Admin and HR — either can approve.")}</span>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
          <button className="btn btn-gold" disabled={busy || !!missing} onClick={submit}>{busy ? t("Sending…") : editing ? t("Save changes") : employee ? t("Add for the employee") : t("Send for approval")}</button>
        </div>
      </>}>
      <div className="col" style={{ gap: 14 }}>
        {!editing && <EmployeePicker value={employee} onChange={setEmployee} />}
        <div className="grid2">
          <label className="field">{t("From")} *
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); if (e.target.value && toDate < e.target.value) setToDate(e.target.value); setProblem(null); }} />
          </label>
          <label className="field">{t("To")} *
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setProblem(null); }} />
          </label>
        </div>
        {isSingleDay && (
          <label className="field">{t("Duration")}
            <select value={part} onChange={(e) => setPart(e.target.value as OnDutyPart)}>
              {(Object.keys(PART_LABEL) as OnDutyPart[]).map((option) => <option key={option} value={option}>{t(PART_LABEL[option])}</option>)}
            </select>
          </label>
        )}
        <div className="kv"><span className="muted">{t("Days")}</span><b className="num">{days > 0 ? (sentPart !== "FULL" ? t("Half day") : days === 1 ? t("1 day") : t("{n} days", { n: days })) : "—"}</b></div>
        <label className="field">{t("Reason")} *
          <textarea value={reason} maxLength={REMOTE_WORK_MAX_REASON} onChange={(e) => { setReason(e.target.value); setProblem(null); }} placeholder={t("e.g. Internet repair at home")} />
        </label>
        <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("An approved remote work day counts as a normal working day, even without a check-in. On a half day, the other half is a normal working half.")}</p>
        {problem && <p className="chip bad" role="alert" style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal", margin: 0 }}>{t(problem)}</p>}
        {!problem && missing && (reason || fromDate !== today || toDate !== today) ? <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t(missing, { days: REMOTE_WORK_MAX_DAYS })}</p> : null}
      </div>
    </Modal>
  );
}

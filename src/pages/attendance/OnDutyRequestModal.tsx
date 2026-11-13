import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { formatDayMonthYear, todayIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { editOnDuty, requestOnDuty, type DayOutcome } from "./actions";
import { EmployeePicker, type PickedEmployee } from "@/components/EmployeePicker";
import { latestOnDutyDay, PART_LABEL, rangeProblem, type OnDutyItem, type OnDutyPart } from "./onDuty";
import { onBehalfOf } from "./requestKinds";

/**
 * The Add On Duty request form: the day (or a range of days, one request per day), the duration, where the duty is and why. The server
 * checks everything again; days that do not fit (holiday, weekly off, leave, a day that already has a request) are skipped and listed.
 * With `editing` it changes a pending request instead (one day, no employee).
 */
export function OnDutyRequestModal({ onClose, editing }: { onClose: () => void; editing?: OnDutyItem }) {
  const t = useT();
  const toast = useToast();
  const { user } = usePage();
  const [busy, start] = useTransition();
  const today = todayIn(user.timeZone);
  const [date, setDate] = useState(editing?.date ?? today);
  const [toDate, setToDate] = useState("");
  const [employee, setEmployee] = useState<PickedEmployee | null>(null);
  const [part, setPart] = useState<OnDutyPart>(editing?.part ?? "FULL");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [reason, setReason] = useState(editing?.reason ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<DayOutcome[] | null>(null);
  const isRange = !editing && !!toDate && toDate !== date;
  const invalidRange = rangeProblem(date, toDate);
  const missing = invalidRange ? t(invalidRange) : !reason.trim() ? t("Enter the reason for the On Duty request.") : null;

  const submit = () => start(async () => {
    if (editing) {
      const changed = await editOnDuty(editing.id, { date, part, location: location.trim() || undefined, reason: reason.trim() });
      if (!changed.ok) { setProblem(changed.error); return; }
      toast(changed.message!);
      onClose();
      return;
    }
    const result = await requestOnDuty({ ...onBehalfOf(employee?.id), date, toDate: isRange ? toDate : undefined, part, location: location.trim() || undefined, reason: reason.trim() });
    if (!result.ok) { setProblem(result.error); return; }
    const failed = result.data?.filter((outcome) => !outcome.ok) ?? [];
    const made = (result.data ?? []).filter((outcome) => outcome.ok).length;
    toast((result.data?.length ?? 0) > 1 ? t("{n} of {total} requests added", { n: made, total: result.data!.length }) : result.message!);
    // a range with days that did not fit stays open and says which ones
    if (failed.length) setOutcomes(result.data!); else onClose();
  });

  return (
    <Modal title={editing ? t("Change On Duty request") : t("Add On Duty request")} eyebrow={t("Attendance")} size="sm" onClose={onClose}
      footer={<>
        <span className="faint" style={{ fontSize: 12.5 }}>{editing ? t("It stays pending; the approvers see the new details.") : employee ? t("Approved at once if the business setting is on, else it waits for an approver.") : t("Goes to Admin and HR — either can approve.")}</span>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>{outcomes ? t("Close") : t("Cancel")}</button>
          {!outcomes && <button className="btn btn-gold" disabled={busy || !!missing} onClick={submit}>{busy ? t("Sending…") : editing ? t("Save changes") : employee ? t("Add for the employee") : t("Send for approval")}</button>}
        </div>
      </>}>
      {outcomes ? (
        <div className="col" style={{ gap: 8 }}>
          <b>{t("Result for each day")}</b>
          {outcomes.map((outcome) => (
            <div className="kv" key={outcome.date}><span className="num">{formatDayMonthYear(outcome.date)}</span><span className={`chip ${outcome.ok ? "ok" : "bad"}`} style={{ height: "auto", whiteSpace: "normal" }}>{t(outcome.message)}</span></div>
          ))}
        </div>
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {!editing && <EmployeePicker permission="appr.reg" value={employee} onChange={setEmployee} />}
          <div className="grid2">
            <label className="field">{t("Date")}
              <input type="date" value={date} max={latestOnDutyDay(today)} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
            {!editing && (
              <label className="field">{t("Until date")} <span className="hint">{t("optional")}</span>
                <input type="date" value={toDate} min={date} max={latestOnDutyDay(today)} onChange={(e) => setToDate(e.target.value)} />
              </label>
            )}
          </div>
          {isRange && <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("One request is made for each day. Days that do not fit are skipped and listed.")}</p>}
          <label className="field">{t("Duration")}
            <select value={part} onChange={(e) => setPart(e.target.value as OnDutyPart)}>
              {(Object.keys(PART_LABEL) as OnDutyPart[]).map((option) => <option key={option} value={option}>{t(PART_LABEL[option])}</option>)}
            </select>
          </label>
          <label className="field">{t("Place")} <span className="hint">{t("optional")}</span>
            <input value={location} maxLength={120} placeholder={t("e.g. Client office, Pune")} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="field">{t("Reason")} *
            <textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder={t("e.g. Meeting the client for the quarterly review")} />
          </label>
          {problem && <p className="chip bad" role="alert" style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal", margin: 0 }}>{t(problem)}</p>}
          {!problem && missing && <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{missing}</p>}
        </div>
      )}
    </Modal>
  );
}

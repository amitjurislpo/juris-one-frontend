import { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { apiData } from "@/lib/api";
import { formatDayMonthYear, formatHours, todayIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { editRegularization, requestRegularization, type DayOutcome } from "./actions";
import { EmployeePicker, type PickedEmployee } from "@/components/EmployeePicker";
import { onBehalfOf } from "./requestKinds";
import { KIND_LABEL, minutesBetweenLocal, prefillUnlessTouched, toLocalInput, type DayPreview, type RegularizationItem, type RegularizationKind, type RegularizationRules } from "./regularization";

/**
 * The Request Regularization form: the request type, the day, the real check-in and check-out (live total hours), a reason from the
 * business's list, a description and an optional (or mandatory) attachment. The server checks everything again and works out Old / New.
 * With `editing` it changes a pending request (the day stays; no employee, range or attachment).
 */
export function RegularizationRequestModal({ date: initialDate, onClose, editing }: { date: string; onClose: () => void; editing?: RegularizationItem }) {
  const t = useT();
  const toast = useToast();
  const { user } = usePage();
  const [busy, start] = useTransition();
  const today = todayIn(user.timeZone);
  const [date, setDate] = useState(initialDate);
  const [preview, setPreview] = useState<DayPreview | null>(null);
  const [rules, setRules] = useState<RegularizationRules | null>(null);
  const [kind, setKind] = useState<RegularizationKind | "">((editing?.kind as RegularizationKind | undefined) ?? "");
  const [checkIn, setCheckIn] = useState(toLocalInput(editing?.checkIn ?? null, user.timeZone));
  const [checkOut, setCheckOut] = useState(toLocalInput(editing?.checkOut ?? null, user.timeZone));
  // fields the user has edited since the day (or employee) last changed: a late preview must not overwrite them
  const touched = useRef({ kind: false, checkIn: false, checkOut: false });
  const [reasonId, setReasonId] = useState(editing?.reasonId ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [toDate, setToDate] = useState("");
  const [employee, setEmployee] = useState<PickedEmployee | null>(null);
  const [outcomes, setOutcomes] = useState<DayOutcome[] | null>(null);
  const employeeId = employee?.id ?? "";

  // the day (or the employee) changes → what is recorded for it (prefill) and the month's remaining requests
  useEffect(() => {
    let current = true;
    touched.current = { kind: !!editing, checkIn: !!editing, checkOut: !!editing }; // an edit keeps what the request says
    setPreview(null);
    apiData<DayPreview>(`/api/v1/attendance/mine/days/${date}${employeeId ? `?employeeId=${employeeId}` : ""}`).then((day) => {
      if (!current) return;
      setPreview(day);
      setKind((typed) => prefillUnlessTouched(typed, day.eligibleKinds[0] ?? "", touched.current.kind));
      setCheckIn((typed) => prefillUnlessTouched(typed, day.checkInLocal ?? "", touched.current.checkIn));
      setCheckOut((typed) => prefillUnlessTouched(typed, day.checkOutLocal ?? "", touched.current.checkOut));
    }).catch(() => { if (current) setPreview({ date, status: "", label: "", checkInLocal: null, checkOutLocal: null, workedMinutes: 0, eligibleKinds: [] }); });
    apiData<RegularizationRules>(`/api/v1/attendance/regularization-rules?month=${date.slice(0, 7)}`).then((loaded) => { if (current) setRules(loaded); }).catch(() => {});
    return () => { current = false; };
  }, [date, employeeId, editing]);

  const reason = rules?.reasons.find((candidate) => candidate.id === reasonId);
  const minutes = minutesBetweenLocal(checkIn, checkOut);
  const needsCheckIn = kind === "ABSENT" || kind === "LATE_CHECKIN";
  const needsCheckOut = kind === "ABSENT" || kind === "MISSED_CHECKOUT";
  const limit = rules && !employeeId && !editing ? rules.remainingThisMonth : null;
  const maxBytes = (rules?.maxAttachmentMb ?? 5) * 1024 * 1024;

  const chooseFile = (file: File | null) => {
    if (file && file.size > maxBytes) { setProblem(t("Files up to {n} MB.", { n: rules?.maxAttachmentMb ?? 5 })); return; }
    setProblem(null);
    setAttachment(file);
  };

  const missing =
    !kind ? t("This day has nothing to regularize.")
    : needsCheckIn && !checkIn ? t("Enter the check-in time.")
    : needsCheckOut && !checkOut ? t("Enter the check-out time.")
    : checkIn && checkOut && minutes === null ? t("Check-out must be after check-in.")
    : !reasonId ? t("Choose a reason.")
    : reason?.requiresDescription && !description.trim() ? t("Add a description for this reason.")
    : rules?.attachmentMandatory && !attachment && !editing ? t("Attach a supporting document.")
    : limit === 0 ? t("You have used all your requests for this month.")
    : null;

  const submit = () => start(async () => {
    if (!kind) return;
    if (editing) {
      const changed = await editRegularization(editing.id, { kind, checkIn, checkOut, reasonId, description: description.trim() });
      if (!changed.ok) { setProblem(changed.error); return; }
      toast(changed.message!);
      onClose();
      return;
    }
    const result = await requestRegularization({ date, toDate: toDate && toDate !== date ? toDate : undefined, ...onBehalfOf(employeeId), kind, checkIn, checkOut, reasonId, description: description.trim() }, attachment);
    if (!result.ok) { setProblem(result.error); return; }
    const failed = result.data?.filter((outcome) => !outcome.ok) ?? [];
    const made = (result.data ?? []).filter((outcome) => outcome.ok).length;
    toast((result.data?.length ?? 0) > 1 ? t("{n} of {total} requests added", { n: made, total: result.data!.length }) : result.message!);
    // a range with days that did not fit stays open and says which ones
    if (failed.length) setOutcomes(result.data!); else onClose();
  });

  return (
    <Modal title={editing ? t("Change regularization request") : t("Request regularization")} eyebrow={t("Attendance")} size="sm" onClose={onClose}
      footer={<>
        <span className="faint" style={{ fontSize: 12.5 }}>{editing ? t("It stays pending; the approvers see the new details.") : t("Goes to Admin and HR — either can approve.")}</span>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>{outcomes ? t("Close") : t("Cancel")}</button>
          {!outcomes && <button className="btn btn-gold" disabled={busy || !preview || !!missing} onClick={submit}>{busy ? t("Sending…") : editing ? t("Save changes") : t("Send for approval")}</button>}
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
            <input type="date" value={date} disabled={!!editing} max={today} min={rules ? new Date(Date.parse(`${today}T00:00:00Z`) - rules.backDateLimitDays * 86400000).toISOString().slice(0, 10) : undefined}
              onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          {!editing && <label className="field">{t("Until date")} <span className="hint">{t("optional")}</span>
            <input type="date" value={toDate} min={date} max={today} onChange={(e) => { setToDate(e.target.value); if (!kind) { touched.current.kind = true; setKind("ABSENT"); } }} />
          </label>}
        </div>
        {toDate && toDate !== date && <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("One request is made for each day, with the same times. Days that do not fit are skipped and listed.")}</p>}
        <label className="field">{t("Request type")}
          <select value={kind} disabled={!editing && !preview?.eligibleKinds.length && !toDate} onChange={(e) => { touched.current.kind = true; setKind(e.target.value as RegularizationKind); }}>
            {(editing || (toDate && toDate !== date) ? Object.keys(KIND_LABEL) as RegularizationKind[] : preview?.eligibleKinds ?? []).map((option) => <option key={option} value={option}>{t(KIND_LABEL[option])}</option>)}
          </select>
        </label>
        {!editing && preview && !preview.eligibleKinds.length && <div className="chip neutral" style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal" }}>{t("This day has nothing to regularize.")}</div>}
        <div className="grid2">
          <label className="field">{t("Check-in")} {needsCheckIn ? "*" : <span className="hint">{t("optional")}</span>}
            <input type="datetime-local" value={checkIn} max={`${today}T23:59`} onChange={(e) => { touched.current.checkIn = true; setCheckIn(e.target.value); }} />
          </label>
          <label className="field">{t("Check-out")} {needsCheckOut ? "*" : <span className="hint">{t("optional")}</span>}
            <input type="datetime-local" value={checkOut} onChange={(e) => { touched.current.checkOut = true; setCheckOut(e.target.value); }} />
          </label>
        </div>
        <div className="kv"><span className="muted">{t("Total hours")}</span><b className="num">{minutes === null ? "—" : formatHours(minutes / 60)}</b></div>
        <label className="field">{t("Reason")} *
          <select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
            <option value="">{t("Choose a reason")}</option>
            {rules?.reasons.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label className="field">{t("Description")} {reason?.requiresDescription ? "*" : <span className="hint">{t("optional")}</span>}
          <textarea value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder={t("e.g. Was on a client call, forgot to check out")} />
        </label>
        {!editing && <label className="field">{t("Attachment")} {rules?.attachmentMandatory ? "*" : <span className="hint">{t("optional")}</span>}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} />
          <span className="hint">{t("PDF, Excel, Word or image — up to {n} MB.", { n: rules?.maxAttachmentMb ?? 5 })}</span>
        </label>}
        {rules && !editing && <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("{left} of {limit} requests left this month.", { left: rules.remainingThisMonth, limit: rules.monthlyLimit })}</p>}
        {problem && <p className="chip bad" role="alert" style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal", margin: 0 }}>{problem}</p>}
        {!problem && missing && (editing || preview?.eligibleKinds.length) ? <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{missing}</p> : null}
      </div>
      )}
    </Modal>
  );
}

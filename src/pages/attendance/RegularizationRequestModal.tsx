import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { apiData } from "@/lib/api";
import { formatHours, todayIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";
import { requestRegularization } from "./actions";
import { KIND_LABEL, minutesBetweenLocal, type DayPreview, type RegularizationKind, type RegularizationRules } from "./regularization";

/**
 * The Request Regularization form: the request type, the day, the real check-in and check-out (live total hours), a reason from the
 * business's list, a description and an optional (or mandatory) attachment. The server checks everything again and works out Old / New.
 */
export function RegularizationRequestModal({ date: initialDate, onClose }: { date: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { user } = usePage();
  const [busy, start] = useTransition();
  const today = todayIn(user.timeZone);
  const [date, setDate] = useState(initialDate);
  const [preview, setPreview] = useState<DayPreview | null>(null);
  const [rules, setRules] = useState<RegularizationRules | null>(null);
  const [kind, setKind] = useState<RegularizationKind | "">("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // the day changes → what is recorded for it (prefill) and the month's remaining requests
  useEffect(() => {
    let current = true;
    setPreview(null);
    apiData<DayPreview>(`/api/v1/attendance/mine/days/${date}`).then((day) => {
      if (!current) return;
      setPreview(day);
      setKind(day.eligibleKinds[0] ?? "");
      setCheckIn(day.checkInLocal ?? "");
      setCheckOut(day.checkOutLocal ?? "");
    }).catch(() => { if (current) setPreview({ date, status: "", label: "", checkInLocal: null, checkOutLocal: null, workedMinutes: 0, eligibleKinds: [] }); });
    apiData<RegularizationRules>(`/api/v1/attendance/regularization-rules?month=${date.slice(0, 7)}`).then((loaded) => { if (current) setRules(loaded); }).catch(() => {});
    return () => { current = false; };
  }, [date]);

  const reason = rules?.reasons.find((candidate) => candidate.id === reasonId);
  const minutes = minutesBetweenLocal(checkIn, checkOut);
  const needsCheckIn = kind === "ABSENT" || kind === "LATE_CHECKIN";
  const needsCheckOut = kind === "ABSENT" || kind === "MISSED_CHECKOUT";
  const limit = rules ? rules.remainingThisMonth : null;
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
    : rules?.attachmentMandatory && !attachment ? t("Attach a supporting document.")
    : limit === 0 ? t("You have used all your requests for this month.")
    : null;

  const submit = () => start(async () => {
    if (!kind) return;
    const result = await requestRegularization({ date, kind, checkIn, checkOut, reasonId, description: description.trim() }, attachment);
    if (result.ok) { toast(result.message!); onClose(); } else setProblem(result.error);
  });

  return (
    <Modal title={t("Request regularization")} eyebrow={t("Attendance")} size="sm" onClose={onClose}
      footer={<>
        <span className="faint" style={{ fontSize: 12.5 }}>{t("Goes to Admin and HR — either can approve.")}</span>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
          <button className="btn btn-gold" disabled={busy || !preview || !!missing} onClick={submit}>{busy ? t("Sending…") : t("Send for approval")}</button>
        </div>
      </>}>
      <div className="col" style={{ gap: 14 }}>
        <label className="field">{t("Date")}
          <input type="date" value={date} max={today} min={rules ? new Date(Date.parse(`${today}T00:00:00Z`) - rules.backDateLimitDays * 86400000).toISOString().slice(0, 10) : undefined}
            onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <label className="field">{t("Request type")}
          <select value={kind} disabled={!preview?.eligibleKinds.length} onChange={(e) => setKind(e.target.value as RegularizationKind)}>
            {(preview?.eligibleKinds ?? []).map((option) => <option key={option} value={option}>{t(KIND_LABEL[option])}</option>)}
          </select>
        </label>
        {preview && !preview.eligibleKinds.length && <div className="chip neutral" style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal" }}>{t("This day has nothing to regularize.")}</div>}
        <div className="grid2">
          <label className="field">{t("Check-in")} {needsCheckIn ? "*" : <span className="hint">{t("optional")}</span>}
            <input type="datetime-local" value={checkIn} max={`${today}T23:59`} onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <label className="field">{t("Check-out")} {needsCheckOut ? "*" : <span className="hint">{t("optional")}</span>}
            <input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
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
        <label className="field">{t("Attachment")} {rules?.attachmentMandatory ? "*" : <span className="hint">{t("optional")}</span>}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} />
          <span className="hint">{t("PDF, Excel, Word or image — up to {n} MB.", { n: rules?.maxAttachmentMb ?? 5 })}</span>
        </label>
        {rules && <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{t("{left} of {limit} requests left this month.", { left: rules.remainingThisMonth, limit: rules.monthlyLimit })}</p>}
        {problem && <p className="chip bad" role="alert" style={{ height: "auto", padding: "10px 12px", whiteSpace: "normal", margin: 0 }}>{problem}</p>}
        {!problem && missing && preview?.eligibleKinds.length ? <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>{missing}</p> : null}
      </div>
    </Modal>
  );
}

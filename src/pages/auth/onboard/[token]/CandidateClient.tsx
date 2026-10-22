
import { useRouter } from "@/lib/router";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { removeCandidateDocument, saveCandidateForm, submitOnboarding, type CandidateForm } from "../actions";

interface CandidateDoc { id: string; kind: string; label: string; fileName: string; status: "PENDING" | "VERIFIED" | "REJECTED"; comment: string | null }
export interface CandidateView {
  candidateName: string; personalEmail: string; businessName: string; designation: string | null; joiningDate: string | null; india: boolean;
  status: string; editable: boolean; hrComment: string | null; linkExpiresAt: string; form: CandidateForm;
  documents: CandidateDoc[]; checklist: { kind: string; label: string; needed: number; uploaded: number }[]; kinds: Record<string, string>;
}

const DOC_CHIP = { PENDING: { cls: "neutral", text: "Uploaded" }, VERIFIED: { cls: "ok", text: "Verified" }, REJECTED: { cls: "bad", text: "Please replace" } } as const;

/** The candidate's guided form: details, documents, submit. */
export function CandidateClient({ token, view }: { token: string; view: CandidateView }) {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState<CandidateForm>(view.form);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState(view.checklist.find((c) => c.uploaded < c.needed)?.kind ?? "OTHER");
  const isReadOnly = !view.editable;
  const set = (fieldName: keyof CandidateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setForm({ ...form, [fieldName]: e.target.value }); setNotice(null); };
  const field = (fieldName: keyof CandidateForm, label: string, opts: { type?: string; placeholder?: string; isRequired?: boolean; maxLength?: number } = {}) => (
    <label className="field">{t(label)}{opts.isRequired ? " *" : ""}
      <input type={opts.type ?? "text"} value={form[fieldName]} onChange={set(fieldName)} placeholder={opts.placeholder ? t(opts.placeholder) : undefined} maxLength={opts.maxLength ?? 120} disabled={isReadOnly} />
    </label>
  );
  const save = (then?: () => Promise<void>) => start(async () => {
    const result = await saveCandidateForm(token, form);
    if (!result.ok) { setNotice({ ok: false, text: result.error }); return; }
    if (then) await then(); else setNotice({ ok: true, text: t("Saved. You can come back to this link until it expires.") });
  });
  const submit = () => save(async () => {
    const result = await submitOnboarding(token);
    setNotice({ ok: result.ok, text: result.ok ? result.message! : result.error });
    if (result.ok) router.refresh();
  });
  const upload = async (file: File) => {
    setUploading(true);
    setNotice(null);
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);
    try {
      const res = await fetch(`/api/public/onboardings/${encodeURIComponent(token)}/documents`, { method: "POST", body: formData });
      const j = await res.json().catch(() => ({}));
      setNotice({ ok: res.ok, text: res.ok ? j.message ?? t("Uploaded") : j.detail ?? t("Upload failed") });
      router.refresh();
    } finally { setUploading(false); }
  };
  const remove = (id: string) => start(async () => {
    const result = await removeCandidateDocument(token, id);
    if (!result.ok) setNotice({ ok: false, text: result.error });
    router.refresh();
  });

  return (
    <div className="col" style={{ gap: 18 }}>
      <header>
        <span className="eyebrow">{view.businessName}</span>
        <h1 className="display" style={{ fontSize: 34, margin: "4px 0 6px" }}>{t("Welcome, {name}", { name: form.firstName || view.candidateName.split(" ")[0] })}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {view.designation
            ? (view.joiningDate ? t("You're joining as {role} on {date}.", { role: view.designation, date: formatDayMonthYear(view.joiningDate) }) : t("You're joining as {role}.", { role: view.designation }))
            : (view.joiningDate ? t("You're joining the team on {date}.", { date: formatDayMonthYear(view.joiningDate) }) : t("You're joining the team."))}
          {" "}{t("Fill in your details and upload your documents; HR will review them. Your link works until {date}.", { date: formatDayMonthYear(view.linkExpiresAt.slice(0, 10)) })}
        </p>
      </header>

      {view.hrComment && <div className="card" role="alert" style={{ padding: 16, background: "var(--warnbg)", borderColor: "transparent" }}><b>{t("HR asked for changes:")}</b> {view.hrComment}</div>}
      {isReadOnly && <div className="card" style={{ padding: 16, background: "var(--okbg)", borderColor: "transparent" }}><b>{t("Submitted.")}</b> {t("HR is reviewing your details and will contact you if anything else is needed.")}</div>}

      <section className="card" style={{ padding: 20 }}>
        <div className="card-h"><h3>{t("1 · About you")}</h3></div>
        <div className="col" style={{ gap: 12 }}>
          <div className="grid3">{field("firstName", "First name", { isRequired: true, maxLength: 60 })}{field("middleName", "Middle name", { maxLength: 60 })}{field("lastName", "Last name", { isRequired: true, maxLength: 60 })}</div>
          <div className="grid3">
            {field("fatherName", "Father's name", { isRequired: true })}
            {field("dateOfBirth", "Date of birth", { type: "date", isRequired: true })}
            <label className="field">{t("Gender")}
              <select value={form.gender} onChange={set("gender")} disabled={isReadOnly}><option value="">{t("Prefer not to say")}</option><option value="Female">{t("Female")}</option><option value="Male">{t("Male")}</option><option value="Other">{t("Other")}</option></select>
            </label>
          </div>
          <div className="field">{t("Mobile number *")}
            <PhoneInput label="Mobile number" code={form.phoneCountry || "+91"} number={form.phone} disabled={isReadOnly} onChange={(countryCode, phoneNumber) => { setForm({ ...form, phoneCountry: countryCode, phone: phoneNumber }); setNotice(null); }} />
          </div>
          <label className="field">{t("Current address *")}<textarea value={form.currentAddress} onChange={set("currentAddress")} rows={2} maxLength={500} disabled={isReadOnly} /></label>
          <label className="field">{t("Permanent address")} <span className="hint">{t("if different")}</span><textarea value={form.permanentAddress} onChange={set("permanentAddress")} rows={2} maxLength={500} disabled={isReadOnly} /></label>
        </div>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div className="card-h"><h3>{t("2 · Identity & bank")}</h3><small className="muted">{t("Stored encrypted")}</small></div>
        <div className="col" style={{ gap: 12 }}>
          {view.india && <div className="grid3">{field("pan", "PAN (optional)", { placeholder: "ABCDE1234F", maxLength: 10 })}{field("aadhaar", "Aadhaar (optional)", { placeholder: "12 digits", maxLength: 14 })}{field("uan", "UAN", { placeholder: "if you have PF already", maxLength: 12 })}</div>}
          <div className="grid3">{field("bankName", "Bank", { isRequired: true, maxLength: 80 })}{field("bankAccount", "Account number", { isRequired: true, maxLength: 18 })}{view.india ? field("ifsc", "IFSC", { isRequired: true, placeholder: "HDFC0001234", maxLength: 11 }) : <span />}</div>
        </div>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div className="card-h"><h3>{t("3 · Previous job & emergency contact")}</h3></div>
        <div className="col" style={{ gap: 12 }}>
          <div className="grid2">{field("previousEmployer", "Previous employer")}{field("previousDesignation", "Your designation there")}</div>
          <div className="grid2">{field("emergencyName", "Emergency contact", { isRequired: true })}{field("emergencyRelation", "Relationship", { maxLength: 40 })}</div>
          <div className="field">{t("Their phone *")}
            <PhoneInput label="Emergency contact phone" code={form.emergencyPhoneCountry || "+91"} number={form.emergencyPhone} disabled={isReadOnly}
              onChange={(countryCode, phoneNumber) => { setForm({ ...form, emergencyPhoneCountry: countryCode, emergencyPhone: phoneNumber }); setNotice(null); }} />
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div className="card-h"><h3>{t("4 · Documents")}</h3><small className="muted">{t("PDF, JPG or PNG · up to 10 MB each")}</small></div>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {view.checklist.map((checklistItem) => (
            <li key={checklistItem.kind} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`chip ${checklistItem.uploaded >= checklistItem.needed ? "ok" : "warn"}`}>{checklistItem.uploaded}/{checklistItem.needed}</span>{checklistItem.label}
            </li>
          ))}
        </ul>
        {view.documents.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 12 }}>
            <table className="t">
              <tbody>
                {view.documents.map((uploadedDocument) => (
                  <tr key={uploadedDocument.id}>
                    <td><b>{uploadedDocument.label}</b><br /><a className="linkish" href={`/api/public/onboardings/${encodeURIComponent(token)}/documents/${uploadedDocument.id}/file`} target="_blank" rel="noopener">{uploadedDocument.fileName}</a></td>
                    <td><span className={`chip ${DOC_CHIP[uploadedDocument.status].cls}`}>{t(DOC_CHIP[uploadedDocument.status].text)}</span>{uploadedDocument.comment && <><br /><small className="muted">{uploadedDocument.comment}</small></>}</td>
                    <td className="r">{!isReadOnly && uploadedDocument.status !== "VERIFIED" && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => remove(uploadedDocument.id)} aria-label={t("Remove {name}", { name: uploadedDocument.fileName })}><Icon name="trash" size={14} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isReadOnly && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="field" style={{ minWidth: 260, flex: 1 }}>{t("Document type")}
              <select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(view.kinds).map(([documentKind, label]) => <option key={documentKind} value={documentKind}>{label}</option>)}</select>
            </label>
            <label className="btn" style={{ cursor: uploading ? "wait" : "pointer" }}>
              <Icon name="upload" size={14} />{uploading ? t("Uploading…") : t("Choose file")}
              <input type="file" accept="application/pdf,image/png,image/jpeg" hidden disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
            </label>
          </div>
        )}
      </section>

      {notice && <div className={notice.ok ? "card" : "err"} role={notice.ok ? "status" : "alert"} style={notice.ok ? { padding: 12, background: "var(--okbg)", borderColor: "transparent" } : undefined}>{notice.text}</div>}
      {!isReadOnly && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn" disabled={busy} onClick={() => save()}>{busy ? t("Saving…") : t("Save for later")}</button>
          <button className="btn btn-gold" disabled={busy} onClick={submit}><Icon name="check" size={15} />{t("Submit to HR")}</button>
        </div>
      )}
    </div>
  );
}


import { useRouter } from "@/lib/router";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import type { LetterField, LetterTemplateRow, LetterType } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { createTemplate, issueLetter, previewLetter, templateDetail, updateTemplate } from "./actions";

export const TYPE_LABEL: Record<LetterType, string> = {
  OFFER: "Offer letter", APPOINTMENT: "Appointment letter", EXPERIENCE: "Experience letter", RELIEVING: "Relieving letter", EMPLOYMENT_VERIFICATION: "Employment verification",
};

export interface EmployeeChoice { id: string; code: string; name: string; designation: string; status: string; exitDate: string | null }

/** Pick a template and an employee, preview the text, issue it. */
export function IssueLetter({ templates, employees, canSalary }: { templates: LetterTemplateRow[]; employees: EmployeeChoice[]; canSalary: boolean }) {
  const readOnly = useReadOnly();
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ templateId: "", employeeId: "", lastWorkingDate: "" });
  const [preview, setPreview] = useState<{ subject: string; text: string } | null>(null);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const usable = templates.filter((t) => t.active);
  const change = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setPreview(null); setErr(""); };
  const ready = form.templateId && form.employeeId;

  const show = () => start(async () => {
    const result = await previewLetter(form);
    if (result.ok) setPreview(result.data!); else { setErr(result.error); setPreview(null); }
  });
  const issue = () => start(async () => {
    const result = await issueLetter(form);
    if (result.ok) { toast(result.message!); setPreview(null); setForm({ ...form, lastWorkingDate: "" }); router.refresh(); } else setErr(result.error);
  });

  if (readOnly) return null;
  return (
    <section className="card enter" style={{ ["--i" as string]: 1, padding: 18 }}>
      <div className="card-h"><h3>{t("Issue a letter")}</h3></div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="field" style={{ minWidth: 240 }}>{t("Template")}
          <select value={form.templateId} onChange={(e) => change({ templateId: e.target.value })}>
            <option value="">{t("Choose…")}</option>
            {usable.map((template) => <option key={template.id} value={template.id} disabled={template.needsSalary && !canSalary}>{template.name}{template.needsSalary ? ` ${canSalary ? t("(states salary)") : t("(needs salary access)")}` : ""}</option>)}
          </select>
        </label>
        <label className="field" style={{ minWidth: 240 }}>{t("Employee")}
          <select value={form.employeeId} onChange={(e) => change({ employeeId: e.target.value })}>
            <option value="">{t("Choose…")}</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.code}{employee.status === "EXITED" ? ` ${t("(exited)")}` : ""}</option>)}
          </select>
        </label>
        <label className="field">{t("Last working day")} <span className="hint">{t("only if the letter uses it")}</span>
          <input type="date" value={form.lastWorkingDate} onChange={(e) => change({ lastWorkingDate: e.target.value })} />
        </label>
        <button className="btn" disabled={!ready || busy} onClick={show}><Icon name="eye" size={14} />{t("Preview")}</button>
        <button className="btn btn-gold" disabled={!ready || busy} onClick={issue}><Icon name="upload" size={14} />{t("Issue letter")}</button>
      </div>
      {err && <div className="err" role="alert" style={{ marginTop: 12 }}>{err}</div>}
      {preview && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <span className="eyebrow">{t("Preview, nothing is saved yet")}</span>
          <h3 style={{ margin: "6px 0 10px" }}>{preview.subject}</h3>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{preview.text}</div>
        </div>
      )}
    </section>
  );
}

/** Create or edit a template; merge fields are inserted at the cursor. */
function TemplateEditor({ id, fields, onClose }: { id: string | null; fields: LetterField[]; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<{ type: LetterType; name: string; subject: string; body: string; active: boolean }>({ type: "EXPERIENCE", name: "", subject: "", body: "", active: true });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (id === null) return;
    let alive = true;
    void templateDetail(id).then((result) => {
      if (!alive) return;
      if (result.ok) setForm({ type: result.data!.type, name: result.data!.name, subject: result.data!.subject, body: result.data!.body, active: result.data!.active });
      else setErr(result.error);
    });
    return () => { alive = false; };
  }, [id]);

  const insert = (name: string) => {
    const textarea = area.current;
    const tag = `{{${name}}}`;
    if (!textarea) return setForm({ ...form, body: form.body + tag });
    const selectionStart = textarea.selectionStart ?? form.body.length, selectionEnd = textarea.selectionEnd ?? selectionStart;
    setForm({ ...form, body: form.body.slice(0, selectionStart) + tag + form.body.slice(selectionEnd) });
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(selectionStart + tag.length, selectionStart + tag.length); });
  };
  const save = () => start(async () => {
    const result = id ? await updateTemplate(id, { name: form.name, subject: form.subject, body: form.body, active: form.active }) : await createTemplate(form);
    if (result.ok) { toast(result.message!); router.refresh(); onClose(); } else setErr(result.error);
  });

  return (
    <Modal title={id ? t("Edit template") : t("New template")} eyebrow={t("HR letters")} maxWidth={820} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Save template")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {!id && (
            <label className="field">{t("Type")}
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LetterType })}>
                {(Object.keys(TYPE_LABEL) as LetterType[]).map((letterType) => <option key={letterType} value={letterType}>{t(TYPE_LABEL[letterType])}</option>)}
              </select>
            </label>
          )}
          <label className="field" style={{ flex: 1, minWidth: 200 }}>{t("Name")}<input value={form.name} maxLength={100} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErr(""); }} /></label>
          <label className="field" style={{ flex: 2, minWidth: 240 }}>{t("Subject line")}<input value={form.subject} maxLength={200} onChange={(e) => { setForm({ ...form, subject: e.target.value }); setErr(""); }} /></label>
        </div>
        <label className="field">{t("Letter text")} <span className="hint">{t("plain text; a blank line starts a new paragraph")}</span>
          <textarea ref={area} rows={14} value={form.body} onChange={(e) => { setForm({ ...form, body: e.target.value }); setErr(""); }} style={{ fontFamily: "inherit", lineHeight: 1.55, height: "auto", padding: 12 }} />
        </label>
        <div>
          <span className="eyebrow">{t("Merge fields, click to insert")}</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {fields.map((field) => <button key={field.name} type="button" className={`chip ${field.salary ? "warn" : "neutral"} nodot`} title={field.label} style={{ cursor: "pointer" }} onClick={() => insert(field.name)}>{`{{${field.name}}}`}</button>)}
          </div>
          <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>{t("Fields in amber state a salary. A template that uses one can only be issued by someone who manages salary structures, never by HR.")}</p>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />{t("Available for issuing")}
        </label>
        {err && <div className="err" role="alert">{err}</div>}
      </div>
    </Modal>
  );
}

export function TemplatesTable({ templates, fields }: { templates: LetterTemplateRow[]; fields: LetterField[] }) {
  const t = useT();
  const readOnly = useReadOnly();
  const [editing, setEditing] = useState<string | null | undefined>(undefined); // undefined = closed, null = new
  return (
    <section className="card enter" style={{ ["--i" as string]: 2 }}>
      <div className="card-h" style={{ padding: "16px 18px 0" }}>
        <h3>{t("Templates")}</h3>
        {!readOnly && <button className="btn btn-sm" onClick={() => setEditing(null)}><Icon name="plus" size={14} />{t("New template")}</button>}
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>{t("Template")}</th><th className="hide-sm">{t("Type")}</th><th>{t("Status")}</th><th className="hide-sm">{t("Version")}</th><th></th></tr></thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td><b>{template.name}</b><br /><small className="muted">{template.subject}</small></td>
                <td className="muted hide-sm">{t(TYPE_LABEL[template.type])}</td>
                <td>
                  {template.active ? <span className="chip ok">{t("On")}</span> : <span className="chip neutral">{t("Off")}</span>}
                  {template.needsSalary && <span className="chip warn nodot" style={{ marginLeft: 6 }}>{t("States salary")}</span>}
                </td>
                <td className="num hide-sm">v{template.version}</td>
                <td className="r">{!readOnly && <button className="btn btn-sm" onClick={() => setEditing(template.id)}>{t("Edit")}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <TemplateEditor key={editing ?? "new"} id={editing} fields={fields} onClose={() => setEditing(undefined)} />}
    </section>
  );
}

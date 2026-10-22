
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { createDepartment, deleteDepartment } from "./actions";

export function NewDepartmentButton({ createdByName, heads }: { createdByName: string; heads: { id: string; name: string; title: string }[] }) {
  const toast = useToast();
  const t = useT();
  const readOnly = useReadOnly();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", headId: "", description: "" });
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const close = () => { setOpen(false); setTried(false); setErr(""); setForm({ name: "", headId: "", description: "" }); };
  const save = () => {
    setTried(true);
    if (!form.name.trim()) return;
    start(async () => {
      const result = await createDepartment(form);
      if (result.ok) { toast(result.message!); close(); }
      else setErr(result.error);
    });
  };
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-gold btn-lg" onClick={() => setOpen(true)}><Icon name="plus" size={16} />{t("New department")}</button>
      {open && (
        <Modal title={t("New department")} eyebrow={t("Created by {name}", { name: createdByName })} size="sm" onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Creating…") : t("Create department")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <label className="field">{t("Department name *")}
              <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErr(""); }} placeholder={t("e.g. Intellectual Property")} maxLength={80} autoFocus onKeyDown={(e) => e.key === "Enter" && save()} />
              {tried && !form.name.trim() && <span className="err">{t("Name is required")}</span>}
            </label>
            <label className="field">{t("Department head")} <span className="hint">{t("optional")}</span>
              <select value={form.headId} onChange={(e) => setForm({ ...form, headId: e.target.value })}>
                <option value="">{t("Not assigned yet")}</option>
                {heads.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.title}</option>)}
              </select>
            </label>
            <label className="field">{t("Description")} <span className="hint">{t("optional")}</span>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("What this team does")} maxLength={300} />
            </label>
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function DepartmentActions({ id, name }: { id: string; name: string }) {
  const toast = useToast();
  const t = useT();
  const readOnly = useReadOnly();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  const delParts = t("Delete {name}? It has no current employees. Past employees keep it on their record.", { name: "\u0000" }).split("\u0000");
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-sm btn-ghost" onClick={() => setAsk(true)} aria-label={t("Delete {name}", { name })}><Icon name="trash" size={14} /></button>
      {ask && (
        <ConfirmDialog title={t("Delete department")} danger confirm={t("Delete")} busy={busy} onClose={() => setAsk(false)}
          body={<>{delParts[0]}<b>{name}</b>{delParts[1]}</>}
          onConfirm={() => start(async () => { const result = await deleteDepartment(id); toast(result.ok ? result.message! : result.error, "bad"); setAsk(false); })} />
      )}
    </>
  );
}

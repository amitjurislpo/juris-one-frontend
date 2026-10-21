import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import type { RoleTemplate, RoleTemplates } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { createRoleTemplate, deleteRoleTemplate, updateRoleTemplate } from "../platform/actions";

interface Form { name: string; permissions: string[]; assignable: string[]; active: boolean }

const toForm = (x?: RoleTemplate): Form => x
  ? { name: x.name, permissions: x.permissions, assignable: x.assignable, active: x.active }
  : { name: "", permissions: [], assignable: [], active: true };

const toggle = (list: string[], key: string, on: boolean) => (on ? [...list, key] : list.filter((k) => k !== key));

/** "New role template" (no template) or the edit button on a row. */
export function RoleTemplateButton({ template, groups, templates }: { template?: RoleTemplate; groups: RoleTemplates["groups"]; templates: RoleTemplate[] }) {
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Form>(toForm(template));
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const set = (x: Partial<Form>) => { setF({ ...f, ...x }); setErr(""); };
  const close = () => { setOpen(false); setErr(""); };
  const fixed = !!template?.locked;
  const save = () => {
    if (!f.name.trim()) return setErr(t("Enter the role name."));
    start(async () => {
      const r = template ? await updateRoleTemplate(template.key, f) : await createRoleTemplate(f);
      if (r.ok) { toast(r.msg ?? t("Saved")); close(); } else setErr(r.error);
    });
  };
  return (
    <>
      {template
        ? <button className="btn btn-sm btn-ghost" onClick={() => { setF(toForm(template)); setOpen(true); }} aria-label={t("Edit {name}", { name: template.name })}><Icon n="edit" s={14} /></button>
        : <button className="btn btn-gold btn-lg" onClick={() => { setF(toForm()); setOpen(true); }}><Icon n="plus" s={16} />{t("New role template")}</button>}
      {open && (
        <Modal title={template ? t("Edit role template") : t("New role template")} eyebrow={t("Platform")} maxWidth={760} onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button>{!fixed && <button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Save role template")}</button>}</>}>
          <div className="col" style={{ gap: 14 }}>
            <label className="field">{t("Role name *")}<input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} disabled={fixed} autoFocus /></label>
            {fixed && <p className="muted" style={{ margin: 0 }}>{t("The Owner role has full access and cannot be changed.")}</p>}
            {groups.map((g) => (
              <div key={g.name} className="field">{t(g.name)}
                {g.permissions.map((p) => (
                  <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                    <input type="checkbox" disabled={fixed} checked={f.permissions.includes(p.key)} onChange={(e) => set({ permissions: toggle(f.permissions, p.key, e.target.checked) })} />{t(p.label)}
                  </label>
                ))}
              </div>
            ))}
            <div className="field">{t("Can add people as")}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {templates.filter((x) => x.key !== template?.key && !x.locked).map((x) => (
                  <button key={x.key} type="button" className={`pill${f.assignable.includes(x.key) ? " on" : ""}`} aria-pressed={f.assignable.includes(x.key)} disabled={fixed}
                    onClick={() => set({ assignable: toggle(f.assignable, x.key, !f.assignable.includes(x.key)) })}>{x.name}</button>
                ))}
              </div>
            </div>
            {template && !template.mandatory && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} />{t("Offered to businesses")}
              </label>
            )}
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function RoleTemplateDeleteButton({ template }: { template: RoleTemplate }) {
  const toast = useToast();
  const t = useT();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  const why = template.mandatory ? t("Every business has this role") : template.businesses > 0 ? t("In use by a business") : undefined;
  return (
    <>
      <button className="btn btn-sm btn-ghost" disabled={!!why} title={why} onClick={() => setAsk(true)} aria-label={t("Delete {name}", { name: template.name })}><Icon n="trash" s={14} /></button>
      {ask && (
        <ConfirmDialog title={t("Delete role template")} danger confirm={t("Delete")} busy={busy} onClose={() => setAsk(false)}
          body={<>{t("Delete the {name} template? Businesses are not affected.", { name: template.name })}</>}
          onConfirm={() => start(async () => { const r = await deleteRoleTemplate(template.key); toast(r.ok ? (r.msg ?? t("Deleted")) : r.error, r.ok ? undefined : "bad"); setAsk(false); })} />
      )}
    </>
  );
}

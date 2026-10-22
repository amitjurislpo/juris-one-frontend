import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import type { RoleTemplate, RoleTemplates } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { createRoleTemplate, deleteRoleTemplate, updateRoleTemplate } from "../platform/actions";

interface Form { name: string; permissions: string[]; assignable: string[]; active: boolean }

const toForm = (roleTemplate?: RoleTemplate): Form => roleTemplate
  ? { name: roleTemplate.name, permissions: roleTemplate.permissions, assignable: roleTemplate.assignable, active: roleTemplate.active }
  : { name: "", permissions: [], assignable: [], active: true };

const toggle = (list: string[], key: string, isIncluded: boolean) => (isIncluded ? [...list, key] : list.filter((listedKey) => listedKey !== key));

/** "New role template" (no template) or the edit button on a row. */
export function RoleTemplateButton({ template, groups, templates }: { template?: RoleTemplate; groups: RoleTemplates["groups"]; templates: RoleTemplate[] }) {
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [templateForm, setF] = useState<Form>(toForm(template));
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const set = (x: Partial<Form>) => { setF({ ...templateForm, ...x }); setErr(""); };
  const close = () => { setOpen(false); setErr(""); };
  const fixed = !!template?.locked;
  const save = () => {
    if (!templateForm.name.trim()) return setErr(t("Enter the role name."));
    start(async () => {
      const saveResult = template ? await updateRoleTemplate(template.key, templateForm) : await createRoleTemplate(templateForm);
      if (saveResult.ok) { toast(saveResult.message ?? t("Saved")); close(); } else setErr(saveResult.error);
    });
  };
  return (
    <>
      {template
        ? <button className="btn btn-sm btn-ghost" onClick={() => { setF(toForm(template)); setOpen(true); }} aria-label={t("Edit {name}", { name: template.name })}><Icon name="edit" size={14} /></button>
        : <button className="btn btn-gold btn-lg" onClick={() => { setF(toForm()); setOpen(true); }}><Icon name="plus" size={16} />{t("New role template")}</button>}
      {open && (
        <Modal title={template ? t("Edit role template") : t("New role template")} eyebrow={t("Platform")} maxWidth={760} onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button>{!fixed && <button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Save role template")}</button>}</>}>
          <div className="col" style={{ gap: 14 }}>
            <label className="field">{t("Role name *")}<input value={templateForm.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} disabled={fixed} autoFocus /></label>
            {fixed && <p className="muted" style={{ margin: 0 }}>{t("The Owner role has full access and cannot be changed.")}</p>}
            {groups.map((group) => (
              <div key={group.name} className="field">{t(group.name)}
                {group.permissions.map((permission) => (
                  <label key={permission.key} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                    <input type="checkbox" disabled={fixed} checked={templateForm.permissions.includes(permission.key)} onChange={(e) => set({ permissions: toggle(templateForm.permissions, permission.key, e.target.checked) })} />{t(permission.label)}
                  </label>
                ))}
              </div>
            ))}
            <div className="field">{t("Can add people as")}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {templates.filter((otherTemplate) => otherTemplate.key !== template?.key && !otherTemplate.locked).map((otherTemplate) => (
                  <button key={otherTemplate.key} type="button" className={`pill${templateForm.assignable.includes(otherTemplate.key) ? " on" : ""}`} aria-pressed={templateForm.assignable.includes(otherTemplate.key)} disabled={fixed}
                    onClick={() => set({ assignable: toggle(templateForm.assignable, otherTemplate.key, !templateForm.assignable.includes(otherTemplate.key)) })}>{otherTemplate.name}</button>
                ))}
              </div>
            </div>
            {template && !template.mandatory && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                <input type="checkbox" checked={templateForm.active} onChange={(e) => set({ active: e.target.checked })} />{t("Offered to businesses")}
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
      <button className="btn btn-sm btn-ghost" disabled={!!why} title={why} onClick={() => setAsk(true)} aria-label={t("Delete {name}", { name: template.name })}><Icon name="trash" size={14} /></button>
      {ask && (
        <ConfirmDialog title={t("Delete role template")} danger confirm={t("Delete")} busy={busy} onClose={() => setAsk(false)}
          body={<>{t("Delete the {name} template? Businesses are not affected.", { name: template.name })}</>}
          onConfirm={() => start(async () => { const deleteResult = await deleteRoleTemplate(template.key); toast(deleteResult.ok ? (deleteResult.message ?? t("Deleted")) : deleteResult.error, deleteResult.ok ? undefined : "bad"); setAsk(false); })} />
      )}
    </>
  );
}


import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/shell/Toasts";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { PERMISSION_GROUPS, PERMISSION_LABEL } from "@/lib/permissions";
import { createRole, deleteRole, setAssignable, setPermission } from "./actions";
import { Avatar } from "@/components/Avatar";

export interface RoleView {
  id: string;
  key: string;
  name: string;
  builtin: boolean;
  locked: boolean;
  perms: string[];
  assign: string[];
  members: { id: string; photo?: number | null; name: string }[];
  totalEver: number;
  /** false for the business owner: roles are set up by the platform. */
  canEdit: boolean;
}

export function RolesClient({ roles, initialSel }: { roles: RoleView[]; initialSel: string }) {
  const toast = useToast();
  const t = useT();
  const readOnly = useReadOnly();
  const [sel, setSel] = useState(initialSel);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [from, setFrom] = useState(roles.find((r) => r.key === "employee")?.id ?? roles[0].id);
  const [tried, setTried] = useState(false);
  const [busy, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  const role = roles.find((r) => r.id === sel) ?? roles[0];
  const canEdit = role.canEdit && !readOnly;
  const locked = role.locked || !canEdit;

  const act = (pendingAction: Promise<{ ok: boolean; message?: string; error?: string }>, bad = false) =>
    start(async () => {
      const actionResult = await pendingAction;
      if (actionResult.ok) toast(actionResult.message ?? t("Saved"), bad ? "bad" : "ok");
      else toast(actionResult.error ?? t("Failed"), "bad");
    });

  return (
    <div className="col">
      <PageHeader eyebrow={t("Administration")} title={t("Roles &")} emphasis={t("permissions")} sub={t("A person's role decides what they see after signing in. Changes apply on their next click.")}>
        {canEdit && <button className="btn btn-gold btn-lg" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t("New role")}</button>}
      </PageHeader>
      <div className="role-grid">
        <div className="role-list enter" style={{ ["--i" as string]: 1 }}>
          {roles.map((listedRole) => (
            <button key={listedRole.id} type="button" className={`role-pick${sel === listedRole.id ? " on" : ""}`} onClick={() => setSel(listedRole.id)} aria-pressed={sel === listedRole.id}>
              <span className="kpi-ico" style={{ background: sel === listedRole.id ? "var(--accent)" : "var(--accentsoft)", color: sel === listedRole.id ? "#fff" : "var(--accent)" }}><Icon name="key" size={15} /></span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <b>{listedRole.name}</b>
                <small>{t(listedRole.members.length === 1 ? "{n} person · {p} permissions" : "{n} people · {p} permissions", { n: listedRole.members.length, p: listedRole.perms.length })}</small>
              </span>
              {!listedRole.builtin && <span className="chip info nodot">{t("Custom")}</span>}
            </button>
          ))}
        </div>
        <section className="card pad enter" style={{ ["--i" as string]: 2, minWidth: 0, opacity: busy ? 0.75 : 1 }} key={role.id}>
          <span className="spot"></span>
          <div className="card-h">
            <div>
              <h3 className="display" style={{ fontSize: 28, margin: 0 }}>{role.name}</h3>
              <span className="faint" style={{ fontSize: 12.5 }}>{role.locked ? t("Full access · cannot be changed") : readOnly ? t("Subscription ended · view only") : !role.canEdit ? t("Roles are set up for your business by JurisOne.") : t("Toggle what this role can do")}</span>
            </div>
            {!role.builtin && canEdit && (
              <button className="btn btn-sm btn-danger" disabled={role.totalEver > 0 || busy} title={role.totalEver ? t("Move people (including past employees) to another role first") : ""}
                onClick={() => setConfirmDel(true)}>
                <Icon name="trash" size={14} />{t("Delete role")}
              </button>
            )}
          </div>
          {PERMISSION_GROUPS.map(([groupLabel, groupPermissions]) => (
            <div key={groupLabel} className="perm-g">
              <div className="eyebrow">{t(groupLabel)}</div>
              {groupPermissions.map((permission) => {
                const has = role.perms.includes(permission);
                return (
                  <div key={permission} className={`perm${has ? "" : " off"}`}>
                    <span id={`perm-${permission}`}>{t(PERMISSION_LABEL[permission])}</span>
                    <button type="button" className="switch" role="switch" aria-checked={has} aria-labelledby={`perm-${permission}`} disabled={locked || busy} onClick={() => act(setPermission(role.id, permission, !has), has)}><i></i></button>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="perm-g">
            <div className="eyebrow">{t("Can add employees with these roles")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {roles.map((otherRole) => {
                const isAssigned = role.assign.includes(otherRole.id);
                return <button key={otherRole.id} type="button" className={`pill${isAssigned ? " on" : ""}`} aria-pressed={isAssigned} disabled={locked || busy} onClick={() => act(setAssignable(role.id, otherRole.id, !isAssigned))}>{otherRole.name}</button>;
              })}
            </div>
            <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>{t("e.g. HR Manager adds HR Executives; Finance Manager adds Finance Executives into Finance only.")}</p>
          </div>
          <div className="perm-g">
            <div className="eyebrow">{t("People with this role")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {role.members.map((member) => (
                <span key={member.id} className="chip neutral nodot" style={{ height: 30, gap: 8 }}>
                  <Avatar id={member.id} name={member.name} photo={member.photo} style={{ width: 20, height: 20, fontSize: 9 }} />{member.name}
                </span>
              ))}
              {!role.members.length && <span className="faint">{t("No one yet — assign this role from People → Add employee.")}</span>}
            </div>
          </div>
        </section>
      </div>

      {confirmDel && (
        <ConfirmDialog title={t("Delete role")} danger confirm={t("Delete role")} busy={busy} onClose={() => setConfirmDel(false)}
          body={<>{t("Delete {name}? This can't be undone.", { name: role.name })}</>}
          onConfirm={() => { act(deleteRole(role.id), true); setConfirmDel(false); setSel(roles.find((employeeRole) => employeeRole.key === "employee")!.id); }} />
      )}

      {adding && (
        <Modal title={t("New role")} eyebrow={t("Administration")} onClose={() => setAdding(false)} size="sm"
          footer={<>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>{t("Cancel")}</button>
            <button className="btn btn-gold" disabled={busy} onClick={() => {
              setTried(true);
              if (!name.trim()) return;
              start(async () => {
                const createResult = await createRole({ name, fromRoleId: from });
                if (createResult.ok) { toast(createResult.message!); setAdding(false); setName(""); setTried(false); if (createResult.data) setSel(createResult.data.id); }
                else toast(createResult.error, "bad");
              });
            }}>{t("Create role")}</button>
          </>}>
          <div className="col" style={{ gap: 14 }}>
            <label className="field">{t("Role name *")}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Payroll Auditor")} maxLength={60} autoFocus />{tried && !name.trim() && <span className="err">{t("Name is required")}</span>}</label>
            <label className="field">{t("Start from")}<select value={from} onChange={(e) => setFrom(e.target.value)}>{roles.map((templateRole) => <option key={templateRole.id} value={templateRole.id}>{templateRole.name}</option>)}</select><span className="hint">{t("Copies its permissions, except Administration.")}</span></label>
          </div>
        </Modal>
      )}
    </div>
  );
}

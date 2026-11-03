import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { getAdditionalRoles, saveAdditionalRoles, type AdditionalRoles } from "./actions";

/** The profile drawer's "Additional roles": what a person holds besides the main role. The admin and HR can change it. */
export function AdditionalRolesSection({ employeeId }: { employeeId: string }) {
  const t = useT();
  const toast = useToast();
  const isReadOnly = useReadOnly();
  const [roles, setRoles] = useState<AdditionalRoles | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, start] = useTransition();

  useEffect(() => {
    let isAlive = true;
    getAdditionalRoles(employeeId).then((result) => {
      if (!isAlive || !result.ok) return;
      setRoles(result.data!);
      setSelected(result.data!.additionalRoles.map((role) => role.id));
    });
    return () => { isAlive = false; };
  }, [employeeId]);

  if (!roles) return null;
  const canChange = roles.canChange && !isReadOnly;
  if (!canChange && roles.additionalRoles.length === 0) return null;

  const options = [...roles.offeredRoles, ...roles.additionalRoles.filter((held) => !roles.offeredRoles.some((offered) => offered.id === held.id))];
  const toggle = (roleId: string) => setSelected((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));

  return (
    <div>
      <div className="eyebrow" style={{ margin: "4px 0 4px" }}>{t("Additional roles")}</div>
      {!isEditing && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {roles.additionalRoles.length === 0 && <span className="faint">{t("None. Only the main role applies.")}</span>}
          {roles.additionalRoles.map((role) => <span key={role.id} className="chip info">{role.name}</span>)}
          {canChange && <button className="linkish" style={{ fontSize: 12.5 }} onClick={() => setIsEditing(true)}>{t("Change")}</button>}
        </div>
      )}
      {isEditing && (
        <>
          <div className="faint" style={{ fontSize: 12.5, marginBottom: 8 }}>{t("An additional role adds its permissions to the main role.")}</div>
          {options.length === 0 && <div className="faint">{t("No other role can be added.")}</div>}
          {options.map((role) => (
            <label key={role.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
              <input type="checkbox" checked={selected.includes(role.id)} onChange={() => toggle(role.id)} />
              <span>{role.name}</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-gold" disabled={isBusy} onClick={() => start(async () => {
              const result = await saveAdditionalRoles(employeeId, selected);
              if (result.ok) { setRoles(result.data!); setIsEditing(false); toast(result.message!, "ok"); } else toast(result.error, "bad");
            })}>{t("Save roles")}</button>
            <button className="btn" disabled={isBusy} onClick={() => { setSelected(roles.additionalRoles.map((role) => role.id)); setIsEditing(false); }}>{t("Cancel")}</button>
          </div>
        </>
      )}
    </div>
  );
}

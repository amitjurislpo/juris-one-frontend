
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Drawer } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import type { AuditRow as Row } from "@/lib/audit-labels";

const show = (fieldValue: unknown) => (fieldValue === undefined || fieldValue === null ? "—" : typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue));

/** before → after, one line per field; changed fields are highlighted. */
function Changes({ before, after }: { before: unknown; after: unknown }) {
  const t = useT();
  const obj = (snapshot: unknown) => (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? (snapshot as Record<string, unknown>) : snapshot == null ? {} : { value: snapshot });
  const beforeFields = obj(before), afterFields = obj(after);
  const keys = [...new Set([...Object.keys(beforeFields), ...Object.keys(afterFields)])];
  if (!keys.length) return <p className="faint" style={{ margin: 0, fontSize: 13 }}>{t("No field changes recorded for this event.")}</p>;
  return (
    <div className="table-wrap">
      <table className="t audit-diff">
        <thead><tr><th>{t("Field")}</th><th>{t("Before")}</th><th>{t("After")}</th></tr></thead>
        <tbody>
          {keys.map((fieldName) => {
            const beforeText = show(beforeFields[fieldName]), afterText = show(afterFields[fieldName]);
            return (
              <tr key={fieldName} className={beforeText !== afterText ? "changed" : undefined}>
                <td className="muted">{fieldName}</td>
                <td className="mono">{beforeText}</td>
                <td className="mono">{afterText}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AuditRow({ row, animationIndex: i, when, whenExact, label, children }: { row: Row; animationIndex: number; when: string; whenExact: string; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <tr onClick={() => setOpen(true)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(true))} tabIndex={0}
        style={{ cursor: "pointer", animationDelay: `${Math.min(i, 20) * 25}ms` }} aria-label={t("{label} by {actor}, {when}", { label, actor: row.actor, when })}>
        {children}
      </tr>
      {open && (
        <Drawer label={t("Audit entry")} width={560} onClose={() => setOpen(false)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><span className="eyebrow" title={whenExact}>{whenExact}</span><h2 className="display" style={{ margin: "4px 0 0", fontSize: 28 }}>{label}</h2></div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("Close")}><Icon name="x" size={16} /></button>
          </div>
          <div>
            <div className="kv"><span className="muted">{t("Who")}</span><b>{row.actor}{row.actorCode ? ` · ${row.actorCode}` : ""}</b></div>
            <div className="kv"><span className="muted">{t("What")}</span><b className="mono" style={{ fontSize: 12.5 }}>{row.action}</b></div>
            <div className="kv"><span className="muted">{t("Record")}</span><b>{row.subject ?? row.entity.replace(/_/g, " ")}{row.entityId && !row.subject ? <span className="faint mono" style={{ fontSize: 11.5, display: "block" }}>{row.entityId}</span> : null}</b></div>
            {row.business && <div className="kv"><span className="muted">{t("Business")}</span><b>{row.business}</b></div>}
            {row.method && <div className="kv"><span className="muted">{t("Request")}</span><b className="mono" style={{ fontSize: 12.5 }}>{row.method} {row.path}</b></div>}
            {row.status != null && <div className="kv"><span className="muted">{t("Result")}</span><b className="mono">{row.status}{row.durationMs != null ? ` · ${row.durationMs} ms` : ""}</b></div>}
            <div className="kv"><span className="muted">{t("IP address")}</span><b className="mono">{row.ipAddress ?? "—"}</b></div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("Before → after")}</div>
            {row.redacted ? (
              <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 14, borderRadius: 12, border: "1px dashed var(--line2)", background: "var(--sunken)" }}>
                <Icon name="lock" size={20} />
                <div><b style={{ fontWeight: 600 }}>{t("Salary & tax details hidden")}</b><div className="muted" style={{ fontSize: 13 }}>{t("Only roles with Finance permissions can see the amounts in this entry.")}</div></div>
              </div>
            ) : <Changes before={row.before} after={row.after} />}
          </div>
        </Drawer>
      )}
    </>
  );
}

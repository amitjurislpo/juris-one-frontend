import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type { PolicyToRead } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear, isoDateIn } from "@/lib/format";
import { PolicyText } from "./PolicyText";


/** Every current company policy, and when the signed-in user accepted it. */
export default function MyPoliciesPage() {
  const { user, t } = usePage();
  const rows = useData<PolicyToRead[]>("/api/v1/policies/mine");
  if (!rows) return <PageLoading />;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Company")} title={<>{t("My")} <em>{t("policies")}</em></>} sub={t("The policies that apply to you. When a policy changes you'll be asked to read and accept the new version.")} />
      {rows.map((policy, i) => (
        <details key={policy.id} className="card enter" style={{ ["--i" as string]: i + 1, padding: "14px 18px" }}>
          <summary style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", listStyle: "none" }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accentsoft)", color: "var(--accent)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="book" size={16} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{policy.title}</b><br />
              <small className="muted">{t("Version {v} · published {date}", { v: policy.version, date: formatDayMonthYear(isoDateIn(policy.publishedAt, user.timeZone)) })}</small>
            </span>
            {policy.acknowledgedAt ? <span className="chip ok">{t("Accepted {date}", { date: formatDayMonthYear(isoDateIn(policy.acknowledgedAt, user.timeZone)) })}</span>
              : policy.requiresAcknowledgement ? <span className="chip warn">{t("To accept")}</span> : <span className="chip neutral">{t("For information")}</span>}
            <Icon name="chevD" size={14} />
          </summary>
          <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            {policy.body ? <PolicyText body={policy.body} /> : null}
            {policy.fileName && (
              <a className="btn btn-sm" href={`/api/v1/policies/${policy.id}/versions/${policy.version}/file`} target="_blank" rel="noopener"><Icon name="doc" size={14} />{t("Open {file}", { file: policy.fileName })}</a>
            )}
          </div>
        </details>
      ))}
      {!rows.length && <div className="empty card"><b className="display">{t("No policies yet")}</b><span className="muted">{t("Company policies will appear here once they are published.")}</span></div>}
    </div>
  );
}

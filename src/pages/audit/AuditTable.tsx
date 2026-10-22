import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pager, Pending, SearchBox, SelectFilter, SortableHeader } from "@/components/table/Table";
import { actionLabel, AUDIT_GROUPS, type AuditGroup, type AuditRow as Row } from "@/lib/audit-labels";
import { toQueryString } from "@/lib/api";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDateTimeSeconds } from "@/lib/format";
import { AuditRow } from "./AuditClient";

const TONE: Record<string, string> = { auth: "neutral", employee: "info", role: "gold", policy: "gold", payroll: "ok", salary: "ok", tax: "ok", proof: "ok", declaration: "ok", request: "neutral", page: "neutral" };

/**
 * The audit log table, shared by the business admin's page (`/api/audit`) and the super admin's page (`/api/platform/audit`,
 * with a Business column and filter). Every entry shows its time to the second; request and page-view entries show what was called.
 */
export function AuditTable({ platform }: { platform?: boolean }) {
  const { user, t, searchParams } = usePage();
  const base = platform ? "/api/platform/audit" : "/api/audit";
  const data = useData<{ page: number; take: number; total: number; rows: Row[]; actors: { value: string; label: string }[]; businesses?: { value: string; label: string }[] }>(`${base}${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { page, take, total, rows, actors, businesses = [] } = data;
  const filtered = Object.keys(searchParams).some((parameterName) => !["page", "sort", "sortDirection"].includes(parameterName));
  const exportQs = toQueryString(Object.fromEntries(Object.entries(searchParams).filter(([parameterName]) => !["page", "sort", "sortDirection"].includes(parameterName))));

  return (
    <div className="col">
      <PageHeader eyebrow={platform ? t("Platform") : t("Administration")} title={t("Audit")} emphasis={t("log")}
        sub={platform
          ? t("Every step in every business and in the platform, recorded to the second — sign-ins, page views, requests and changes. Click an entry to see the details.")
          : t("Every step in your business, recorded to the second — sign-ins, page views, requests and changes. Click an entry to see before → after.")}>
        <a className="btn" href={`${base}/export${exportQs}`} download>{t("Export CSV")}</a>
      </PageHeader>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search person, action or record ID")} label={t("Search the audit log")} />
        {platform && <SelectFilter name="businessId" label={t("Business")} dflt="" options={[{ value: "", label: t("All businesses") }, ...businesses]} />}
        <SelectFilter name="eventGroup" label={t("Event")} dflt="All" options={[{ value: "All", label: t("All events") }, ...(Object.keys(AUDIT_GROUPS) as AuditGroup[]).map((groupName) => ({ value: groupName, label: t(AUDIT_GROUPS[groupName].label) }))]} />
        <SelectFilter name="actorId" label={t("By")} dflt="" options={[{ value: "", label: t("Anyone") }, ...actors]} />
        <SelectFilter name="periodDays" label={t("Period")} dflt="30" options={[{ value: "7", label: t("Last 7 days") }, { value: "30", label: t("Last 30 days") }, { value: "90", label: t("Last 90 days") }, { value: "365", label: t("Last 12 months") }, { value: "All", label: t("All time") }]} />
        <span className="tcount">{t(total === 1 ? "{n} entry" : "{n} entries", { n: total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader sortKey="occurredAt" dflt="occurredAt" dfltDir="desc">{t("When")}</SortableHeader>
                  <SortableHeader sortKey="actor" dflt="occurredAt" dfltDir="desc">{t("Who")}</SortableHeader>
                  {platform && <th>{t("Business")}</th>}
                  <SortableHeader sortKey="action" dflt="occurredAt" dfltDir="desc">{t("What")}</SortableHeader>
                  <th>{t("Record")}</th>
                  <th className="hide-sm">{t("IP")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const occurredAt = new Date(row.occurredAt);
                  const when = formatDateTimeSeconds(occurredAt, user.timeZone);
                  const whenExact = formatDateTimeSeconds(occurredAt, user.timeZone, true);
                  const label = actionLabel(row.action);
                  return (
                    <AuditRow key={row.id} row={row} animationIndex={i} when={when} whenExact={whenExact} label={label}>
                      <td className="num" style={{ whiteSpace: "nowrap" }} title={whenExact}>{when}</td>
                      <td><b style={{ fontWeight: 500 }}>{row.actor}</b>{row.actorCode && <small className="faint" style={{ display: "block" }}>{row.actorCode}</small>}</td>
                      {platform && <td className="muted">{row.business ?? "—"}</td>}
                      <td>
                        <span className={`chip nodot ${TONE[row.action.split(".")[0]] ?? "neutral"}`}>{label}</span>
                        {row.method && <small className="faint mono" style={{ display: "block", marginTop: 4, fontSize: 11.5 }}>{row.method} {row.path}{row.status != null ? ` · ${row.status}` : ""}{row.durationMs != null ? ` · ${row.durationMs} ms` : ""}</small>}
                      </td>
                      <td className="muted">{row.subject ?? row.entity.replace(/_/g, " ")}</td>
                      <td className="mono faint hide-sm" style={{ fontSize: 12 }}>{row.ipAddress ?? "—"}</td>
                    </AuditRow>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <div className="empty"><b>{t("No entries")}</b><span className="muted">{filtered ? t("Try a different search, event or period.") : t("Every step will be recorded here.")}</span>{filtered && <ClearFilters />}</div>
          )}
          <Pager page={page} take={take} total={total} />
        </Pending>
      </section>
    </div>
  );
}

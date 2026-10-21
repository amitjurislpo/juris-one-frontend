import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pager, Pending, SearchBox, SelectFilter, SortTh } from "@/components/table/Table";
import { actionLabel, AUDIT_GROUPS, type AuditGroup, type AuditRow as Row } from "@/lib/audit-labels";
import { qs } from "@/lib/api";
import { PageLoading, useData, usePage } from "@/lib/page";
import { fmtDateTimeSec } from "@/lib/format";
import { AuditRow } from "./AuditClient";

const TONE: Record<string, string> = { auth: "neutral", employee: "info", role: "gold", policy: "gold", payroll: "ok", salary: "ok", tax: "ok", proof: "ok", declaration: "ok", request: "neutral", page: "neutral" };

/**
 * The audit log table, shared by the business admin's page (`/api/audit`) and the super admin's page (`/api/platform/audit`,
 * with a Business column and filter). Every entry shows its time to the second; request and page-view entries show what was called.
 */
export function AuditTable({ platform }: { platform?: boolean }) {
  const { u, t, sp } = usePage();
  const base = platform ? "/api/platform/audit" : "/api/audit";
  const d = useData<{ page: number; take: number; total: number; rows: Row[]; actors: { v: string; l: string }[]; businesses?: { id: string; name: string }[] }>(`${base}${qs(sp)}`);
  if (!d) return <PageLoading />;
  const { page, take, total, rows, actors, businesses = [] } = d;
  const filtered = Object.keys(sp).some((k) => !["page", "sort", "dir"].includes(k));
  const exportQs = qs(Object.fromEntries(Object.entries(sp).filter(([k]) => !["page", "sort", "dir"].includes(k))));

  return (
    <div className="col">
      <PageHeader eyebrow={platform ? t("Platform") : t("Administration")} title={t("Audit")} em={t("log")}
        sub={platform
          ? t("Every step in every business and in the platform, recorded to the second — sign-ins, page views, requests and changes. Click an entry to see the details.")
          : t("Every step in your business, recorded to the second — sign-ins, page views, requests and changes. Click an entry to see before → after.")}>
        <a className="btn" href={`${base}/export${exportQs}`} download>{t("Export CSV")}</a>
      </PageHeader>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search person, action or record ID")} label={t("Search the audit log")} />
        {platform && <SelectFilter name="biz" label={t("Business")} dflt="" options={[{ v: "", l: t("All businesses") }, ...businesses.map((b) => ({ v: b.id, l: b.name }))]} />}
        <SelectFilter name="ev" label={t("Event")} dflt="All" options={[{ v: "All", l: t("All events") }, ...(Object.keys(AUDIT_GROUPS) as AuditGroup[]).map((k) => ({ v: k, l: t(AUDIT_GROUPS[k].label) }))]} />
        <SelectFilter name="actor" label={t("By")} dflt="" options={[{ v: "", l: t("Anyone") }, ...actors]} />
        <SelectFilter name="days" label={t("Period")} dflt="30" options={[{ v: "7", l: t("Last 7 days") }, { v: "30", l: t("Last 30 days") }, { v: "90", l: t("Last 90 days") }, { v: "365", l: t("Last 12 months") }, { v: "All", l: t("All time") }]} />
        <span className="tcount">{t(total === 1 ? "{n} entry" : "{n} entries", { n: total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortTh k="at" dflt="at" dfltDir="desc">{t("When")}</SortTh>
                  <SortTh k="actor" dflt="at" dfltDir="desc">{t("Who")}</SortTh>
                  {platform && <th>{t("Business")}</th>}
                  <SortTh k="action" dflt="at" dfltDir="desc">{t("What")}</SortTh>
                  <th>{t("Record")}</th>
                  <th className="hide-sm">{t("IP")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const at = new Date(r.at);
                  const when = fmtDateTimeSec(at, u.timeZone);
                  const whenExact = fmtDateTimeSec(at, u.timeZone, true);
                  const label = actionLabel(r.action);
                  return (
                    <AuditRow key={r.id} row={r} i={i} when={when} whenExact={whenExact} label={label}>
                      <td className="num" style={{ whiteSpace: "nowrap" }} title={whenExact}>{when}</td>
                      <td><b style={{ fontWeight: 500 }}>{r.actor}</b>{r.actorCode && <small className="faint" style={{ display: "block" }}>{r.actorCode}</small>}</td>
                      {platform && <td className="muted">{r.business ?? "—"}</td>}
                      <td>
                        <span className={`chip nodot ${TONE[r.action.split(".")[0]] ?? "neutral"}`}>{label}</span>
                        {r.method && <small className="faint mono" style={{ display: "block", marginTop: 4, fontSize: 11.5 }}>{r.method} {r.path}{r.status != null ? ` · ${r.status}` : ""}{r.durationMs != null ? ` · ${r.durationMs} ms` : ""}</small>}
                      </td>
                      <td className="muted">{r.subject ?? r.entity.replace(/_/g, " ")}</td>
                      <td className="mono faint hide-sm" style={{ fontSize: 12 }}>{r.ip ?? "—"}</td>
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

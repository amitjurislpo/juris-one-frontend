import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pending, SearchBox, SegmentedFilter, SortableHeader } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { ReviewButton } from "./ProofsClient";
import { Avatar } from "@/components/Avatar";


export default function ProofsPage() {
  const { t, searchParams } = usePage();
  const data = useData<{ rows: { id: string; photo?: number | null; name: string; code: string; department: string; regime: "NEW" | "OLD"; declared: number; pending: number; approved: number }[]; total: number }>(`/api/proofs${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { rows, total } = data;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Finance · Old-regime declarations")} title={t("Investment")} emphasis={t("proofs")} sub={t("Verify what employees declared. Approved amounts reduce their TDS from the next payroll.")} />
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search name, ID or department")} label={t("Search proofs")} />
        <SegmentedFilter name="status" dflt="All" label={t("Status")} options={[{ value: "All", label: t("All") }, { value: "Pending", label: t("To verify") }, { value: "Verified", label: t("Verified") }]} />
        <span className="tcount">{t("{a} of {b}", { a: rows.length, b: total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 1 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader sortKey="name" dflt="pending" dfltDir="desc">{t("Employee")}</SortableHeader>
                  <SortableHeader sortKey="regime" dflt="pending" dfltDir="desc">{t("Regime")}</SortableHeader>
                  <SortableHeader sortKey="declared" dflt="pending" dfltDir="desc" right>{t("Declared")}</SortableHeader>
                  <SortableHeader sortKey="pending" dflt="pending" dfltDir="desc">{t("Status")}</SortableHeader>
                  <th><span className="sr-only">{t("Actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} style={{ animationDelay: `${i * 40}ms` }}>
                    <td><div className="person"><Avatar id={row.id} name={row.name} photo={row.photo} /><div><b>{row.name}</b><small>{row.code} · {row.department}</small></div></div></td>
                    <td><span className={`chip nodot ${row.regime === "OLD" ? "info" : "gold"}`}>{row.regime === "OLD" ? t("Old") : t("New")}</span></td>
                    <td className="r num">{formatRupees(row.declared)}</td>
                    <td>{row.pending ? <span className="chip warn">{t("{n} to verify", { n: row.pending })}</span> : row.approved ? <span className="chip ok">{t("Verified")}</span> : <span className="chip neutral">{t("Nothing submitted")}</span>}</td>
                    <td className="r"><ReviewButton employeeId={row.id} name={row.name} gold={row.pending > 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!total && <div className="empty"><b className="display">{t("No declarations yet")}</b><span className="muted">{t("Employees on the old regime will appear here.")}</span></div>}
          {total > 0 && !rows.length && <div className="empty"><b>{t("No one matches")}</b><ClearFilters /></div>}
        </Pending>
      </section>
    </div>
  );
}

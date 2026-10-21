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
      <PageHeader eyebrow={t("Finance · Old-regime declarations")} title={t("Investment")} em={t("proofs")} sub={t("Verify what employees declared. Approved amounts reduce their TDS from the next payroll.")} />
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
                  <SortableHeader k="name" dflt="pend" dfltDir="desc">{t("Employee")}</SortableHeader>
                  <SortableHeader k="reg" dflt="pend" dfltDir="desc">{t("Regime")}</SortableHeader>
                  <SortableHeader k="dec" dflt="pend" dfltDir="desc" right>{t("Declared")}</SortableHeader>
                  <SortableHeader k="pend" dflt="pend" dfltDir="desc">{t("Status")}</SortableHeader>
                  <th><span className="sr-only">{t("Actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ animationDelay: `${i * 40}ms` }}>
                    <td><div className="person"><Avatar id={r.id} name={r.name} photo={r.photo} /><div><b>{r.name}</b><small>{r.code} · {r.department}</small></div></div></td>
                    <td><span className={`chip nodot ${r.regime === "OLD" ? "info" : "gold"}`}>{r.regime === "OLD" ? t("Old") : t("New")}</span></td>
                    <td className="r num">{formatRupees(r.declared)}</td>
                    <td>{r.pending ? <span className="chip warn">{t("{n} to verify", { n: r.pending })}</span> : r.approved ? <span className="chip ok">{t("Verified")}</span> : <span className="chip neutral">{t("Nothing submitted")}</span>}</td>
                    <td className="r"><ReviewButton employeeId={r.id} name={r.name} gold={r.pending > 0} /></td>
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

import Link from "@/lib/link";
import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pending, SearchBox, SegmentedFilter, SortableHeader } from "@/components/table/Table";
import { can } from "@/lib/session";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString as toQs } from "@/lib/api";
import { formatRupees, formatMonthLabel } from "@/lib/format";
import { TaxRow } from "./TaxClient";
import { Avatar } from "@/components/Avatar";


type TaxRowView = { id: string; photo?: number | null; code: string; name: string; title: string; regime: "NEW" | "OLD"; income: number; deductions: number; taxable: number; tax: number; tds: number; pending: number; overridden: boolean };

export default function TaxPage() {
  const { user, t, searchParams } = usePage();
  const data = useData<{ month: string; financialYear: string; all: TaxRowView[]; rows: TaxRowView[] }>(`/api/tax${toQs(searchParams)}`);
  if (!data) return <PageLoading />;
  const { month, financialYear, all, rows } = data;
  const qs = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))).toString();
  const rp = (rupees: number) => formatRupees(rupees * 100);

  return (
    <div className="col">
      <PageHeader eyebrow={t("Finance · Tax year {fy}", { fy: financialYear })} title={t("Tax")} em={t("& TDS")} sub={t("Monthly TDS for every employee as of {month} payroll, based on their regime and verified investment proofs.", { month: formatMonthLabel(month) })}>
        <a className="btn" href={`/api/tax/export${qs ? `?${qs}` : ""}`} download>{t("Export CSV")}</a>
      </PageHeader>
      <div className="kpis">
        <div className="card kpi enter" style={{ ["--i" as string]: 1 }}><span className="spot"></span><span className="l">{t("Monthly TDS (all)")}</span><span className="v num">{rp(all.reduce((a, r) => a + r.tds, 0))}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 2 }}><span className="spot"></span><span className="l">{t("On old regime")}</span><span className="v"><span className="num">{all.filter((r) => r.regime === "OLD").length}</span><span className="faint" style={{ fontSize: 16 }}> / {all.length}</span></span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 3 }}><span className="spot"></span><span className="l">{t("Proofs pending")}</span><span className="v num">{all.reduce((a, r) => a + r.pending, 0)}</span>{can(user, "proofs.verify") && <Link className="btn btn-sm btn-ghost" style={{ alignSelf: "flex-start", marginTop: 2 }} href="/proofs?st=Pending">{t("Review →")}</Link>}</div>
      </div>
      <div className="toolbar enter" style={{ ["--i" as string]: 4 }}>
        <SearchBox placeholder={t("Search name or ID")} label={t("Search tax")} />
        <SegmentedFilter name="regime" dflt="All" label={t("Regime")} options={[{ value: "All", label: t("All regimes") }, { value: "NEW", label: t("New") }, { value: "OLD", label: t("Old") }]} />
        <span className="tcount">{t("{n} employees", { n: rows.length })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 4 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader k="name" dflt="name">{t("Employee")}</SortableHeader>
                  <SortableHeader k="regime" dflt="name">{t("Regime")}</SortableHeader>
                  <SortableHeader k="income" dflt="name" right>{t("Projected income")}</SortableHeader>
                  <th className="r">{t("Deductions")}</th>
                  <SortableHeader k="taxable" dflt="name" right>{t("Taxable")}</SortableHeader>
                  <SortableHeader k="tax" dflt="name" right>{t("Annual tax")}</SortableHeader>
                  <SortableHeader k="tds" dflt="name" right>{t("Monthly TDS")}</SortableHeader>
                  <SortableHeader k="pending" dflt="name">{t("Proofs")}</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <TaxRow key={r.id} id={r.id} name={r.name} i={i}>
                    <td><div className="person"><Avatar id={r.id} name={r.name} photo={r.photo} /><div><b>{r.name}</b><small>{r.code}</small></div></div></td>
                    <td><span className={`chip nodot ${r.regime === "OLD" ? "info" : "gold"}`}>{r.regime === "OLD" ? t("Old") : t("New")}{r.overridden ? ` · ${t("set by Finance")}` : ""}</span></td>
                    <td className="r num muted">{rp(r.income)}</td>
                    <td className="r num muted">{rp(r.deductions)}</td>
                    <td className="r num">{rp(r.taxable)}</td>
                    <td className="r num">{rp(r.tax)}</td>
                    <td className="r num" style={{ color: "var(--accenttext)", fontWeight: 600 }}>{rp(r.tds)}</td>
                    <td>{r.pending ? <span className="chip warn">{t("{n} pending", { n: r.pending })}</span> : <span className="faint" style={{ fontSize: 12.5 }}>—</span>}</td>
                  </TaxRow>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="empty"><b>{t("No one matches")}</b><ClearFilters /></div>}
        </Pending>
      </section>
    </div>
  );
}

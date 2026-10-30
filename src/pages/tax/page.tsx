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
  const data = useData<{ month: string; financialYear: string; all: TaxRowView[]; rows: TaxRowView[] }>(`/api/v1/tax${toQs(searchParams)}`);
  if (!data) return <PageLoading />;
  const { month, financialYear, all, rows } = data;
  const queryString = new URLSearchParams(Object.entries(searchParams).flatMap(([parameterName, paramValue]) => (typeof paramValue === "string" ? [[parameterName, paramValue]] : []))).toString();
  const formatWholeRupees = (rupees: number) => formatRupees(rupees * 100);

  return (
    <div className="col">
      <PageHeader eyebrow={t("Finance · Tax year {fy}", { fy: financialYear })} title={t("Tax")} emphasis={t("& TDS")} sub={t("Monthly TDS for every employee as of {month} payroll, based on their regime and verified investment proofs.", { month: formatMonthLabel(month) })}>
        <a className="btn" href={`/api/v1/tax/export${queryString ? `?${queryString}` : ""}`} download>{t("Export CSV")}</a>
      </PageHeader>
      <div className="kpis">
        <div className="card kpi enter" style={{ ["--i" as string]: 1 }}><span className="spot"></span><span className="l">{t("Monthly TDS (all)")}</span><span className="v num">{formatWholeRupees(all.reduce((total, row) => total + row.tds, 0))}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 2 }}><span className="spot"></span><span className="l">{t("On old regime")}</span><span className="v"><span className="num">{all.filter((row) => row.regime === "OLD").length}</span><span className="faint" style={{ fontSize: 16 }}> / {all.length}</span></span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 3 }}><span className="spot"></span><span className="l">{t("Proofs pending")}</span><span className="v num">{all.reduce((total, row) => total + row.pending, 0)}</span>{can(user, "proofs.verify") && <Link className="btn btn-sm btn-ghost" style={{ alignSelf: "flex-start", marginTop: 2 }} href="/proofs?st=Pending">{t("Review →")}</Link>}</div>
      </div>
      <div className="toolbar enter" style={{ ["--i" as string]: 4 }}>
        <SearchBox placeholder={t("Search name or ID")} label={t("Search tax")} />
        <SegmentedFilter name="regime" dflt="All" label={t("Regime")} options={[{ value: "All", label: t("All regimes") }, { value: "NEW", label: t("New") }, { value: "OLD", label: t("Old") }]} />
        <span className="tcount">{rows.length === 1 ? t("1 employee") : t("{n} employees", { n: rows.length })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 4 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader sortKey="name" dflt="name">{t("Employee")}</SortableHeader>
                  <SortableHeader sortKey="regime" dflt="name">{t("Regime")}</SortableHeader>
                  <SortableHeader sortKey="income" dflt="name" right>{t("Projected income")}</SortableHeader>
                  <th className="r">{t("Deductions")}</th>
                  <SortableHeader sortKey="taxable" dflt="name" right>{t("Taxable")}</SortableHeader>
                  <SortableHeader sortKey="tax" dflt="name" right>{t("Annual tax")}</SortableHeader>
                  <SortableHeader sortKey="tds" dflt="name" right>{t("Monthly TDS")}</SortableHeader>
                  <SortableHeader sortKey="pending" dflt="name">{t("Proofs")}</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <TaxRow key={row.id} id={row.id} name={row.name} animationIndex={i}>
                    <td><div className="person"><Avatar id={row.id} name={row.name} photo={row.photo} /><div><b>{row.name}</b><small>{row.code}</small></div></div></td>
                    <td><span className={`chip nodot ${row.regime === "OLD" ? "info" : "gold"}`}>{row.regime === "OLD" ? t("Old") : t("New")}{row.overridden ? ` · ${t("set by Finance")}` : ""}</span></td>
                    <td className="r num muted">{formatWholeRupees(row.income)}</td>
                    <td className="r num muted">{formatWholeRupees(row.deductions)}</td>
                    <td className="r num">{formatWholeRupees(row.taxable)}</td>
                    <td className="r num">{formatWholeRupees(row.tax)}</td>
                    <td className="r num" style={{ color: "var(--accenttext)", fontWeight: 600 }}>{formatWholeRupees(row.tds)}</td>
                    <td>{row.pending ? <span className="chip warn">{t("{n} pending", { n: row.pending })}</span> : <span className="faint" style={{ fontSize: 12.5 }}>—</span>}</td>
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

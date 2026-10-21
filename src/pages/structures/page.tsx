import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pending, SearchBox, SegmentedFilter, SelectFilter, SortableHeader } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { formatDayMonthYear, formatRupees } from "@/lib/format";
import { HistoryButton, StructureButton, type SalaryRevision } from "./StructuresClient";
import { Avatar } from "@/components/Avatar";



export default function StructuresPage() {
  const { t, searchParams } = usePage();
  const data = useData<{
    rows: { id: string; photo?: number | null; code: string; name: string; title: string; dateOfJoining: string; revisions: SalaryRevision[]; current: SalaryRevision | null; gross: number }[];
    total: number; departments: { id: string; name: string }[]; today: string; minFrom: string;
  }>(`/api/structures${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { rows, departments, today, minFrom } = data;
  const all = { length: data.total };

  return (
    <div className="col">
      <PageHeader eyebrow={t("Finance · Compensation")} title={t("Salary")} em={t("structures")} sub={t("Set a breakup once. Payroll and TDS use it every month until you add a revision (appraisal or change).")} />
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search name, ID or designation")} label={t("Search structures")} />
        <SelectFilter name="departmentId" label={t("Department")} dflt="All" options={[{ value: "All", label: t("All") }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
        <SegmentedFilter name="structureStatus" dflt="All" label={t("Structure")} options={[{ value: "All", label: t("All") }, { value: "Set", label: t("Set up") }, { value: "Missing", label: t("Not set") }]} />
        <span className="tcount">{t("{a} of {b}", { a: rows.length, b: all.length })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader k="name" dflt="name">{t("Employee")}</SortableHeader>
                  <SortableHeader k="basic" dflt="name" right>{t("Basic")}</SortableHeader>
                  <th className="r">{t("HRA")}</th><th className="r">{t("LTA")}</th><th className="r">{t("Special")}</th>
                  <SortableHeader k="gross" dflt="name" right>{t("Monthly gross")}</SortableHeader>
                  <SortableHeader k="since" dflt="name">{t("Effective from")}</SortableHeader>
                  <th><span className="sr-only">{t("Actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ animationDelay: `${i * 35}ms` }}>
                    <td><div className="person"><Avatar id={r.id} name={r.name} photo={r.photo} /><div><b>{r.name}</b><small>{r.code} · {r.title}</small></div></div></td>
                    {r.current ? (
                      <>
                        <td className="r num muted">{formatRupees(r.current.basic)}</td><td className="r num muted">{formatRupees(r.current.hra)}</td><td className="r num muted">{formatRupees(r.current.lta)}</td><td className="r num muted">{formatRupees(r.current.special)}</td>
                        <td className="r num" style={{ fontWeight: 600 }}>{formatRupees(r.gross)}</td>
                        <td><span className="muted">{formatDayMonthYear(r.current.from)}</span>{r.revisions.length > 1 && <HistoryButton name={r.name} revs={r.revisions} today={today} />}</td>
                      </>
                    ) : (
                      <><td colSpan={5}><span className="chip warn">{t("Not set — needed before payroll")}</span></td><td></td></>
                    )}
                    <td className="r"><StructureButton emp={{ id: r.id, code: r.code, name: r.name, title: r.title, dateOfJoining: r.dateOfJoining }} current={r.current} minFrom={minFrom > r.dateOfJoining ? minFrom : r.dateOfJoining} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="empty"><b>{t("No one matches")}</b><span className="muted">{t("Try another search or filter.")}</span><ClearFilters /></div>}
        </Pending>
      </section>
    </div>
  );
}

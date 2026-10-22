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
      <PageHeader eyebrow={t("Finance · Compensation")} title={t("Salary")} emphasis={t("structures")} sub={t("Set a breakup once. Payroll and TDS use it every month until you add a revision (appraisal or change).")} />
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search name, ID or designation")} label={t("Search structures")} />
        <SelectFilter name="departmentId" label={t("Department")} dflt="All" options={[{ value: "All", label: t("All") }, ...departments.map((department) => ({ value: department.id, label: department.name }))]} />
        <SegmentedFilter name="structureStatus" dflt="All" label={t("Structure")} options={[{ value: "All", label: t("All") }, { value: "Set", label: t("Set up") }, { value: "Missing", label: t("Not set") }]} />
        <span className="tcount">{t("{a} of {b}", { a: rows.length, b: all.length })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader sortKey="name" dflt="name">{t("Employee")}</SortableHeader>
                  <SortableHeader sortKey="basic" dflt="name" right>{t("Basic")}</SortableHeader>
                  <th className="r">{t("HRA")}</th><th className="r">{t("LTA")}</th><th className="r">{t("Special")}</th>
                  <SortableHeader sortKey="gross" dflt="name" right>{t("Monthly gross")}</SortableHeader>
                  <SortableHeader sortKey="since" dflt="name">{t("Effective from")}</SortableHeader>
                  <th><span className="sr-only">{t("Actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} style={{ animationDelay: `${i * 35}ms` }}>
                    <td><div className="person"><Avatar id={row.id} name={row.name} photo={row.photo} /><div><b>{row.name}</b><small>{row.code} · {row.title}</small></div></div></td>
                    {row.current ? (
                      <>
                        <td className="r num muted">{formatRupees(row.current.basic)}</td><td className="r num muted">{formatRupees(row.current.hra)}</td><td className="r num muted">{formatRupees(row.current.lta)}</td><td className="r num muted">{formatRupees(row.current.special)}</td>
                        <td className="r num" style={{ fontWeight: 600 }}>{formatRupees(row.gross)}</td>
                        <td><span className="muted">{formatDayMonthYear(row.current.from)}</span>{row.revisions.length > 1 && <HistoryButton name={row.name} revs={row.revisions} today={today} />}</td>
                      </>
                    ) : (
                      <><td colSpan={5}><span className="chip warn">{t("Not set — needed before payroll")}</span></td><td></td></>
                    )}
                    <td className="r"><StructureButton emp={{ id: row.id, code: row.code, name: row.name, title: row.title, dateOfJoining: row.dateOfJoining }} current={row.current} minFrom={minFrom > row.dateOfJoining ? minFrom : row.dateOfJoining} /></td>
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

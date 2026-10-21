import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pager, Pending, SearchBox, SegmentedFilter, SelectFilter, SortableHeader } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { CopyEmail } from "./CopyEmail";
import { Avatar } from "@/components/Avatar";


/** Everyone (`dir`): name, official email, designation and Active / Past only (REQUIREMENTS §5.3). */
export default function DirectoryPage() {
  const { t, searchParams } = usePage();
  const data = useData<{
    rows: { id: string; photo?: number | null; name: string; email: string; title: string; status: string }[]; total: number; page: number; take: number; activeCount: number; departments: { id: string; name: string }[];
  }>(`/api/directory${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { rows, total, page, take, activeCount, departments } = data;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Directory")} title={t("Find")} em={t("anyone")} sub={t("{n} people at Juris Consultants. Search by name, email or designation.", { n: activeCount })} />
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox big placeholder={t("Search name, email or designation")} label={t("Search directory")} />
        <SelectFilter name="departmentId" label={t("Department")} dflt="All" options={[{ value: "All", label: t("All") }, ...departments.map((x) => ({ value: x.id, label: x.name }))]} />
        <SegmentedFilter name="status" dflt="All" label={t("Status")} options={[{ value: "All", label: t("All") }, { value: "Active", label: t("Active") }, { value: "Past", label: t("Past employees") }]} />
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader k="name" dflt="name">{t("Name")}</SortableHeader>
                  <SortableHeader k="email" dflt="name">{t("Email")}</SortableHeader>
                  <SortableHeader k="title" dflt="name">{t("Designation")}</SortableHeader>
                  <SortableHeader k="status" dflt="name">{t("Status")}</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={e.id} className={e.status === "EXITED" ? "dim" : undefined} style={{ animationDelay: `${i * 30}ms` }}>
                    <td><div className="person"><Avatar id={e.id} name={e.name} photo={e.photo} /><div><b>{e.name}</b></div></div></td>
                    <td><CopyEmail email={e.email} /></td>
                    <td className="muted">{e.title}</td>
                    <td><span className={`chip ${e.status === "EXITED" ? "neutral" : "ok"}`}>{e.status === "EXITED" ? t("Past employee") : t("Active")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="empty"><b>{t("No one found")}</b><span className="muted">{t("Try another name or email.")}</span><ClearFilters /></div>}
          <Pager page={page} take={take} total={total} />
        </Pending>
      </section>
    </div>
  );
}

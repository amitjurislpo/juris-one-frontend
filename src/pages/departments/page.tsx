import { PageHeader } from "@/components/PageHeader";
import { Pending, SearchBox, SortableHeader } from "@/components/table/Table";
import { Icon } from "@/components/Icon";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { formatDayMonthYear } from "@/lib/format";
import { DepartmentActions, NewDepartmentButton } from "./DepartmentsClient";


/** Filtered and sorted by the API from ?search=&sort=&sortDirection=. */
interface Row { id: string; name: string; note: string; head: string; employeeCount: number; createdBy: string; createdOn: string }

export default function DepartmentsPage() {
  const { user, t, searchParams } = usePage();
  const data = useData<{ rows: Row[]; heads: { id: string; name: string; title: string }[] }>(`/api/departments${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { rows, heads } = data;

  return (
    <div className="col">
      <PageHeader eyebrow={t("People operations")} title={<>{t("Depart")}<em>{t("ments")}</em></>} sub={t("Create departments first — new employees are added into one of these.")}>
        <NewDepartmentButton by={user.name} heads={heads} />
      </PageHeader>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search department, head or creator")} label={t("Search departments")} />
        <span className="tcount">{rows.length === 1 ? t("{n} department", { n: rows.length }) : t("{n} departments", { n: rows.length })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader k="name" dflt="name">{t("Department")}</SortableHeader>
                  <SortableHeader k="head" dflt="name">{t("Head")}</SortableHeader>
                  <SortableHeader k="employeeCount" dflt="name" right>{t("People")}</SortableHeader>
                  <SortableHeader k="createdBy" dflt="name">{t("Created by")}</SortableHeader>
                  <SortableHeader k="createdOn" dflt="name">{t("Created on")}</SortableHeader>
                  <th><span className="sr-only">{t("Actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ animationDelay: `${i * 30}ms` }}>
                    <td>
                      <div className="person">
                        <span className="kpi-ico" style={{ width: 34, height: 34, background: "var(--accentsoft)", color: "var(--accent)" }}><Icon n="building" s={16} /></span>
                        <div><b>{r.name}</b>{r.note && <small>{r.note}</small>}</div>
                      </div>
                    </td>
                    <td>{r.head || "—"}</td>
                    <td className="r num">{r.employeeCount}</td>
                    <td className="muted">{r.createdBy}</td>
                    <td className="muted">{formatDayMonthYear(r.createdOn)}</td>
                    <td className="r">{!r.employeeCount && <DepartmentActions id={r.id} name={r.name} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="empty"><b>{t("No departments match")}</b><span className="muted">{t("Try a different search.")}</span></div>}
        </Pending>
      </section>
    </div>
  );
}

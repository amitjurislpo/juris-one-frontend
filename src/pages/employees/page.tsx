import { PageHeader } from "@/components/PageHeader";
import { Pager, Pending, SearchBox, SelectFilter } from "@/components/table/Table";
import { toQueryString } from "@/lib/api";
import { PageLoading, useData, usePage } from "@/lib/page";
import { AddEmployeeButton, PeopleTable, type PersonRow } from "./PeopleClient";


export default function PeoplePage() {
  const { t, searchParams } = usePage();
  const data = useData<{
    rows: PersonRow[]; total: number; page: number; take: number; departments: { id: string; name: string }[];
    counts: { current: number; usTeam: number; accessDisabled: number; past: number }; seePay: boolean; canAdd: boolean;
  }>(`/api/v1/people${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { rows: people, total, page, take, departments, counts, seePay, canAdd } = data;

  const exportQs = new URLSearchParams(Object.entries(searchParams).flatMap(([key, queryValue]) => (typeof queryValue === "string" && key !== "page" ? [[key, queryValue]] : []))).toString();

  return (
    <div className="col">
      <PageHeader eyebrow={t("People operations")} title={t("All")} emphasis={t("employees")}
        sub={seePay ? t("Employee records, portal access and reporting lines.") : t("Employee records, portal access and reporting lines. Compensation is visible to Finance only.")}>
        <a className="btn" href={`/api/v1/people/export${exportQs ? `?${exportQs}` : ""}`} download>{t("Export CSV")}</a>
        {canAdd && <AddEmployeeButton />}
      </PageHeader>
      <div className="kpis">
        <div className="card kpi enter" style={{ ["--i" as string]: 1 }}><span className="spot"></span><span className="l">{t("Current employees")}</span><span className="v num">{counts.current}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 2 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--info)" }}></i> {t("US team")}</span><span className="v num">{counts.usTeam}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 3 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--bad)" }}></i> {t("Access disabled")}</span><span className="v num">{counts.accessDisabled}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 4 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--faint)" }}></i> {t("Past employees")}</span><span className="v num">{counts.past}</span></div>
      </div>
      <div className="toolbar enter" style={{ ["--i" as string]: 5 }}>
        <SearchBox placeholder={t("Search name, ID, email, designation, manager")} label={t("Search people")} />
        <SelectFilter name="departmentId" label={t("Department")} dflt="All" options={[{ value: "All", label: t("All") }, ...departments.map((department) => ({ value: department.id, label: department.name }))]} />
        <SelectFilter name="status" label={t("Status")} dflt="Current" options={[{ value: "Current", label: t("Current") }, { value: "ACTIVE", label: t("Active") }, { value: "PROBATION", label: t("Probation") }, { value: "ONBOARDING", label: t("Onboarding") }, { value: "EXITED", label: t("Past employees") }, { value: "All", label: t("All") }]} />
        <SelectFilter name="access" label={t("Access")} dflt="All" options={[{ value: "All", label: t("All") }, { value: "Enabled", label: t("Enabled") }, { value: "Disabled", label: t("Disabled") }]} />
        <span className="tcount">{t("{total} shown", { total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 6 }}>
        <Pending>
          <PeopleTable rows={people} />
          <Pager page={page} take={take} total={total} />
        </Pending>
      </section>
    </div>
  );
}

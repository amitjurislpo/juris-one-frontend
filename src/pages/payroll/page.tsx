import Link from "@/lib/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pending, SearchBox, SelectFilter } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { formatDayMonthYear, formatMonthLabel } from "@/lib/format";
import type { PayView } from "@/lib/api-types";
import { CloseButton, MonthSeg, PayrollKpis, PayrollTable } from "./PayrollClient";


export default function PayrollPage() {
  const { t, searchParams } = usePage();
  const data = useData<{
    month: string; months: string[]; closed: boolean; attendanceLocked: boolean; approved: boolean; closedOn: string | null; missing: string[];
    rows: PayView[]; view: PayView[]; canClose: boolean; canStructures: boolean;
  }>(`/api/v1/payroll${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { month, months, closed, attendanceLocked, approved, rows, view } = data;
  const missing = data.missing.map((fullName) => ({ fullName }));
  const stages = [
    { label: t("Lock attendance"), done: attendanceLocked },
    { label: t("Compute"), done: attendanceLocked },
    { label: t("Review & edit"), done: approved },
    { label: t("Approve"), done: approved },
    { label: t("Close & publish"), done: closed },
  ];
  const nowIdx = stages.findIndex((s) => !s.done);
  const totals = { employeeCount: rows.length, earned: rows.reduce((total, row) => total + row.earned, 0), lop: rows.reduce((total, row) => total + row.lop, 0), tds: rows.reduce((total, row) => total + row.tds, 0), net: rows.reduce((total, row) => total + row.net, 0) };

  return (
    <div className="col">
      <PageHeader eyebrow={t("Finance · Payroll")} title={formatMonthLabel(month).split(" ")[0]} emphasis={t("payroll")} sub={t("Salary comes from each employee's current salary structure. Edit LOP, bonus or deductions before closing.")}>
        <MonthSeg months={months} value={month} />
        {data.canClose || closed
          ? <CloseButton month={month} closed={closed} locked={attendanceLocked} count={rows.length} />
          : <span className="chip warn nodot" title={t("Only the Finance Manager can close payroll")}>{t("Closing needs Finance Manager")}</span>}
      </PageHeader>

      <section className="card pad enter" style={{ ["--i" as string]: 1 }}>
        <span className="spot"></span>
        <div className="stage">
          {stages.map((stage, i) => (
            <div key={stage.label} className={`s ${stage.done ? "done" : i === nowIdx ? "now" : ""}`}>
              <span><i>{stage.done ? "✓" : i + 1}</i>{stage.label}</span>
              <div className="bar"><i style={{ transform: `scaleX(${stage.done ? 1 : i === nowIdx ? 0.5 : 0})` }}></i></div>
            </div>
          ))}
        </div>
        <p className="faint" style={{ margin: "14px 0 0", fontSize: 12.5 }}>
          {closed ? t("Closed on {date} · payslips are visible to employees.", { date: formatDayMonthYear(data.closedOn!) }) : attendanceLocked ? t("Closing publishes payslips to every employee for this month.") : t("Attendance for {month} locks on the 1st of next month at 10:00 AM — figures can still change until then.", { month: formatMonthLabel(month) })}
        </p>
      </section>

      {missing.length > 0 && (
        <section className="card pad enter" style={{ ["--i" as string]: 2, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span className="spot"></span>
          <span className="kpi-ico" style={{ background: "var(--warnbg)", color: "var(--warn)" }}><Icon name="info" size={18} /></span>
          <div style={{ flex: 1 }}><b>{t("{n} employee(s) without a salary structure", { n: missing.length })}</b><div className="muted" style={{ fontSize: 13 }}>{t("{names} — set it up once and it applies every month.", { names: missing.map((e) => e.fullName).join(", ") })}</div></div>
          {data.canStructures && <Link className="btn" href="/structures?structureStatus=Missing">{t("Set up structure")}</Link>}
        </section>
      )}

      <PayrollKpis totals={totals} />

      <div className="toolbar enter" style={{ ["--i" as string]: 8 }}>
        <SearchBox placeholder={t("Search name, ID or department")} label={t("Search payroll")} />
        <SelectFilter name="filter" label={t("Show")} dflt="All" options={[{ value: "All", label: t("Everyone") }, { value: "LOP", label: t("With loss of pay") }, { value: "Edited", label: t("Edited this month") }, { value: "NEW", label: t("New regime") }, { value: "OLD", label: t("Old regime") }]} />
        <span className="tcount">{t("{a} of {b}", { a: view.length, b: rows.length })}</span>
        <details className="menu-anchor" style={{ position: "relative" }}>
          <summary className="btn" style={{ listStyle: "none" }}><Icon name="download" size={15} />{t("Export")}</summary>
          <div className="menu" style={{ minWidth: 220 }}>
            {[["bank", t("Bank transfer file")], ["ecr", t("PF ECR")], ["pt", t("Professional tax summary")], ["tds", t("TDS summary")], ["register", t("Payroll register")]].map(([fileKind, label]) => (
              <a key={fileKind} href={`/api/v1/payroll/export?month=${month}&type=${fileKind}`} download>{label}</a>
            ))}
          </div>
        </details>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 8 }}>
        <Pending><PayrollTable rows={view} month={month} closed={closed} /></Pending>
      </section>
    </div>
  );
}

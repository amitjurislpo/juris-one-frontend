import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pager, Pending, SearchBox, SegmentedFilter, SelectFilter, SortableHeader } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { useT } from "@/lib/i18n/client";
import { toQueryString } from "@/lib/api";
import { formatDayMonth, formatHours, formatMonthLabel } from "@/lib/format";
import { DayNav, ZonePicker } from "./RegisterControls";
import { Avatar } from "@/components/Avatar";


interface Clock { text: string; local: string | null }
interface DailyRow { id: string; photo?: number | null; code: string; name: string; department: string; region: "IN" | "US"; location: string; shiftName: string; status: string; late: boolean; checkIn: Clock | null; checkOut: Clock | null; hours: number }
interface GridRow { id: string; code: string; name: string; department: string; region: "IN" | "US"; cells: { code: string; tone: string }[]; days: { date: string; label: string; workedMinutes: number }[]; present: number; absent: number; leave: number }
interface RegisterData {
  view: "day" | "month"; date: string; month: string; timeZone: string; today: string; page: number; take: number; total: number;
  departments: { id: string; name: string }[]; zones: { value: string; label: string }[]; statuses: string[];
  rows: DailyRow[] & GridRow[]; summary?: { total: number; present: number; notCheckedIn: number; onLeave: number; absent: number };
  days?: { date: string; day: number; weekday: string; weeklyOff: boolean }[]; months?: string[];
}

const CHIP: Record<string, string> = { Present: "ok", Working: "ok", "Half day": "warn", Absent: "bad", "On leave": "info", Holiday: "gold", "Not checked in": "warn" };

export default function RegisterPage() {
  const { t, searchParams } = usePage();
  const register = useData<RegisterData>(`/api/v1/attendance/register${toQueryString(searchParams)}`);
  if (!register) return <PageLoading />;
  const departments = register.departments;
  const exportQs = new URLSearchParams(Object.entries(searchParams).flatMap(([parameterName, paramValue]) => (typeof paramValue === "string" && parameterName !== "page" ? [[parameterName, paramValue]] : []))).toString();
  const departmentOptions = [{ value: "All", label: t("All") }, ...departments.map((department) => ({ value: department.id, label: department.name }))];
  const teamOptions = [{ value: "All", label: t("All") }, { value: "IN", label: t("India") }, { value: "US", label: t("US") }];

  return (
    <div className="col">
      <PageHeader eyebrow={t("People operations · Attendance")} title={t("Attendance")} emphasis={t("register")} sub={t("Everyone's check-ins across India and US teams — shown in the time zone you pick.")}>
        <a className="btn" href={`/api/v1/attendance/register/export${exportQs ? `?${exportQs}` : ""}`} download>{t("Export CSV")}</a>
        <SegmentedFilter name="view" dflt="day" label={t("Register view")} options={[{ value: "day", label: t("Daily log") }, { value: "month", label: t("Monthly grid") }]} />
      </PageHeader>
      {register.view === "day" ? <Daily register={register} departmentOptions={departmentOptions} teamOptions={teamOptions} /> : <Monthly register={register} departmentOptions={departmentOptions} teamOptions={teamOptions} months={register.months ?? []} />}
    </div>
  );
}

type SelectOptions = { value: string; label: string }[];

function Daily({ register, departmentOptions, teamOptions }: { register: RegisterData; departmentOptions: SelectOptions; teamOptions: SelectOptions }) {
  const t = useT();
  // the API filters, sorts and returns this page of rows (50 per page)
  const page: DailyRow[] = register.rows;
  const sum = register.summary!;
  return (
    <>
      <div className="kpis">
        <div className="card kpi enter" style={{ ["--i" as string]: 1 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--ok)" }}></i> {t("Present")}</span><span className="v"><span className="num">{sum.present}</span><span className="faint" style={{ fontSize: 16 }}> / {sum.total}</span></span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 2 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--warn)" }}></i> {t("Not checked in")}</span><span className="v num">{sum.notCheckedIn}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 3 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--info)" }}></i> {t("On leave")}</span><span className="v num">{sum.onLeave}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 4 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--bad)" }}></i> {t("Absent")}</span><span className="v num">{sum.absent}</span></div>
      </div>
      <div className="toolbar enter" style={{ ["--i" as string]: 5 }}>
        <DayNav day={register.date} max={register.today} />
        <ZonePicker zones={register.zones} value={register.timeZone} />
        <SearchBox placeholder={t("Search employee")} label={t("Search employee")} />
        <SelectFilter name="region" label={t("Team")} dflt="All" options={teamOptions} />
        <SelectFilter name="departmentId" label={t("Department")} dflt="All" options={departmentOptions} />
        <SelectFilter name="status" label={t("Status")} dflt="All" options={register.statuses.map((status) => ({ value: status, label: t(status) }))} />
      </div>
      <section className="card enter" style={{ ["--i" as string]: 6 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader sortKey="name" dflt="name">{t("Employee")}</SortableHeader>
                  <SortableHeader sortKey="location" dflt="name">{t("Team")}</SortableHeader>
                  <SortableHeader sortKey="status" dflt="name">{t("Status")}</SortableHeader>
                  <SortableHeader sortKey="checkIn" dflt="name">{t("Check-in")}</SortableHeader>
                  <SortableHeader sortKey="checkOut" dflt="name">{t("Check-out")}</SortableHeader>
                  <SortableHeader sortKey="hours" dflt="name" right>{t("Worked")}</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {page.map((summaryRow, i) => (
                  <tr key={summaryRow.id} style={{ animationDelay: `${i * 30}ms` }}>
                    <td><div className="person"><Avatar id={summaryRow.id} name={summaryRow.name} photo={summaryRow.photo} /><div><b>{summaryRow.name}</b><small>{summaryRow.code} · {summaryRow.department} · {summaryRow.shiftName}</small></div></div></td>
                    <td><span className={`chip nodot ${summaryRow.region === "IN" ? "gold" : "info"}`}>{summaryRow.location}</span></td>
                    <td><span className={`chip ${CHIP[summaryRow.status] ?? "neutral"}`}>{t(summaryRow.status)}</span>{summaryRow.late && <span className="chip warn nodot" style={{ marginLeft: 6 }}>{t("Late")}</span>}</td>
                    <td className="num"><b style={{ fontWeight: 500 }}>{summaryRow.checkIn?.text ?? "—"}</b>{summaryRow.checkIn?.local && <div className="faint" style={{ fontSize: 11.5 }}>{t("{time} local", { time: summaryRow.checkIn.local })}</div>}</td>
                    <td className="num"><b style={{ fontWeight: 500 }}>{summaryRow.checkOut?.text ?? (summaryRow.status === "Working" ? t("Working now") : "—")}</b>{summaryRow.checkOut?.local && <div className="faint" style={{ fontSize: 11.5 }}>{t("{time} local", { time: summaryRow.checkOut.local })}</div>}</td>
                    <td className="r num">{summaryRow.hours ? formatHours(summaryRow.hours) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!register.total && <div className="empty"><b>{t("No one matches")}</b><span className="muted">{t("Change the filters above.")}</span><ClearFilters /></div>}
          <Pager page={register.page} take={register.take} total={register.total} />
        </Pending>
      </section>
      <p className="faint enter" style={{ margin: 0, fontSize: 12.5 }}>{t("(+1) / (−1) means the time falls on the next / previous calendar day in the selected zone — e.g. the India night shift seen from New York.")}</p>
    </>
  );
}

function Monthly({ register, departmentOptions, teamOptions, months }: { register: RegisterData; departmentOptions: SelectOptions; teamOptions: SelectOptions; months: string[] }) {
  const t = useT();
  const page: GridRow[] = register.rows;
  const days = register.days ?? [];
  return (
    <>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SelectFilter name="month" label={t("Month")} dflt={register.today.slice(0, 7)} options={months.map((month) => ({ value: month, label: formatMonthLabel(month) }))} />
        <SearchBox placeholder={t("Search employee")} label={t("Search employee")} />
        <SelectFilter name="region" label={t("Team")} dflt="All" options={teamOptions} />
        <SelectFilter name="departmentId" label={t("Department")} dflt="All" options={departmentOptions} />
        <span className="tcount">{register.total === 1 ? t("1 person") : t("{n} people", { n: register.total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t reg">
              <thead>
                <tr>
                  <SortableHeader sortKey="name" dflt="name" className="stick">{t("Employee")}</SortableHeader>
                  {days.map((day) => <th key={day.date} className={`dcol${day.weeklyOff ? " wk" : ""}`}><span>{t(day.weekday)}</span><b>{day.day}</b></th>)}
                  <SortableHeader sortKey="present" dflt="name" right>P</SortableHeader>
                  <SortableHeader sortKey="absent" dflt="name" right>A</SortableHeader>
                  <SortableHeader sortKey="leave" dflt="name" right>L</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {page.map((row) => (
                  <tr key={row.id}>
                    <td className="stick"><b style={{ fontWeight: 600 }}>{row.name}</b><small className="faint" style={{ display: "block", fontSize: 11.5 }}>{row.department} · {row.region === "IN" ? t("India") : t("US")}</small></td>
                    {row.cells.map((cell, j) => <td key={j} className="dcell"><span className={`ac ${cell.tone}`} title={`${formatDayMonth(row.days[j].date)} · ${row.days[j].label ? t(row.days[j].label) : "—"}${row.days[j].workedMinutes ? " · " + formatHours(row.days[j].workedMinutes / 60) : ""}`}>{cell.code}</span></td>)}
                    <td className="r num" style={{ color: "var(--ok)", fontWeight: 600 }}>{row.present}</td>
                    <td className="r num" style={{ color: row.absent ? "var(--bad)" : "var(--faint)" }}>{row.absent}</td>
                    <td className="r num" style={{ color: "var(--info)" }}>{row.leave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!register.total && <div className="empty"><b>{t("No one matches")}</b><span className="muted">{t("Change the filters above.")}</span><ClearFilters /></div>}
          <Pager page={register.page} take={register.take} total={register.total} />
        </Pending>
      </section>
      <div className="legend enter" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span><span className="ac ok">P</span> {t("Present")}</span><span><span className="ac warn">½</span> {t("Half day")}</span><span><span className="ac bad">A</span> {t("Absent / LOP")}</span>
        <span><span className="ac info">L</span> {t("Leave")}</span><span><span className="ac gold">H</span> {t("Holiday")}</span><span><span className="ac warn">–</span> {t("Not checked in yet")}</span><span><span className="ac off"></span> {t("Weekly off")}</span>
      </div>
    </>
  );
}

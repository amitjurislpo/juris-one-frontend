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
  const register = useData<RegisterData>(`/api/attendance/register${toQueryString(searchParams)}`);
  if (!register) return <PageLoading />;
  const departments = register.departments;
  const exportQs = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (typeof v === "string" && k !== "page" ? [[k, v]] : []))).toString();
  const departmentOptions = [{ value: "All", label: t("All") }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const teamOptions = [{ value: "All", label: t("All") }, { value: "IN", label: t("India") }, { value: "US", label: t("US") }];

  return (
    <div className="col">
      <PageHeader eyebrow={t("People operations · Attendance")} title={t("Attendance")} em={t("register")} sub={t("Everyone's check-ins across India and US teams — shown in the time zone you pick.")}>
        <a className="btn" href={`/api/attendance/register/export${exportQs ? `?${exportQs}` : ""}`} download>{t("Export CSV")}</a>
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
        <SelectFilter name="status" label={t("Status")} dflt="All" options={register.statuses.map((s) => ({ value: s, label: t(s) }))} />
      </div>
      <section className="card enter" style={{ ["--i" as string]: 6 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader k="name" dflt="name">{t("Employee")}</SortableHeader>
                  <SortableHeader k="location" dflt="name">{t("Team")}</SortableHeader>
                  <SortableHeader k="status" dflt="name">{t("Status")}</SortableHeader>
                  <SortableHeader k="checkIn" dflt="name">{t("Check-in")}</SortableHeader>
                  <SortableHeader k="checkOut" dflt="name">{t("Check-out")}</SortableHeader>
                  <SortableHeader k="hours" dflt="name" right>{t("Worked")}</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {page.map((r, i) => (
                  <tr key={r.id} style={{ animationDelay: `${i * 30}ms` }}>
                    <td><div className="person"><Avatar id={r.id} name={r.name} photo={r.photo} /><div><b>{r.name}</b><small>{r.code} · {r.department} · {r.shiftName}</small></div></div></td>
                    <td><span className={`chip nodot ${r.region === "IN" ? "gold" : "info"}`}>{r.location}</span></td>
                    <td><span className={`chip ${CHIP[r.status] ?? "neutral"}`}>{t(r.status)}</span>{r.late && <span className="chip warn nodot" style={{ marginLeft: 6 }}>{t("Late")}</span>}</td>
                    <td className="num"><b style={{ fontWeight: 500 }}>{r.checkIn?.text ?? "—"}</b>{r.checkIn?.local && <div className="faint" style={{ fontSize: 11.5 }}>{t("{time} local", { time: r.checkIn.local })}</div>}</td>
                    <td className="num"><b style={{ fontWeight: 500 }}>{r.checkOut?.text ?? (r.status === "Working" ? t("Working now") : "—")}</b>{r.checkOut?.local && <div className="faint" style={{ fontSize: 11.5 }}>{t("{time} local", { time: r.checkOut.local })}</div>}</td>
                    <td className="r num">{r.hours ? formatHours(r.hours) : "—"}</td>
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
        <SelectFilter name="month" label={t("Month")} dflt={register.today.slice(0, 7)} options={months.map((m) => ({ value: m, label: formatMonthLabel(m) }))} />
        <SearchBox placeholder={t("Search employee")} label={t("Search employee")} />
        <SelectFilter name="region" label={t("Team")} dflt="All" options={teamOptions} />
        <SelectFilter name="departmentId" label={t("Department")} dflt="All" options={departmentOptions} />
        <span className="tcount">{t("{n} people", { n: register.total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t reg">
              <thead>
                <tr>
                  <SortableHeader k="name" dflt="name" className="stick">{t("Employee")}</SortableHeader>
                  {days.map((x) => <th key={x.date} className={`dcol${x.weeklyOff ? " wk" : ""}`}><span>{t(x.weekday)}</span><b>{x.day}</b></th>)}
                  <SortableHeader k="present" dflt="name" right>P</SortableHeader>
                  <SortableHeader k="absent" dflt="name" right>A</SortableHeader>
                  <SortableHeader k="leave" dflt="name" right>L</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {page.map((r) => (
                  <tr key={r.id}>
                    <td className="stick"><b style={{ fontWeight: 600 }}>{r.name}</b><small className="faint" style={{ display: "block", fontSize: 11.5 }}>{r.department} · {r.region === "IN" ? t("India") : t("US")}</small></td>
                    {r.cells.map((c, j) => <td key={j} className="dcell"><span className={`ac ${c.tone}`} title={`${formatDayMonth(r.days[j].date)} · ${r.days[j].label ? t(r.days[j].label) : "—"}${r.days[j].workedMinutes ? " · " + formatHours(r.days[j].workedMinutes / 60) : ""}`}>{c.code}</span></td>)}
                    <td className="r num" style={{ color: "var(--ok)", fontWeight: 600 }}>{r.present}</td>
                    <td className="r num" style={{ color: r.absent ? "var(--bad)" : "var(--faint)" }}>{r.absent}</td>
                    <td className="r num" style={{ color: "var(--info)" }}>{r.leave}</td>
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

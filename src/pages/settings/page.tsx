import Link from "@/lib/link";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedFilter } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatWeekdayDayMonthYear, INDIA_TIME_ZONE, MONTH_ABBREVIATIONS, todayIn } from "@/lib/format";
import { useCurrentUser } from "@/lib/session";
import { useT } from "@/lib/i18n/client";
import { pick } from "@/lib/list";
import { PERMISSIONS } from "@/lib/permissions";
import type { SettingValue } from "@/lib/api-types";
import { AttendancePolicyForm } from "./AttendancePolicyForm";


const TABS = ["access", "leave", "holidays", "attendance"] as const;
const num = (d: number | null) => (d == null ? 0 : d);

interface LeaveTypeView { code: string; name: string; annualQuota: number; accrualPerMonth: number; carryForwardCap: number; maxStretch: number | null; encashPerYear: number; encashAfterMonths: number; expiryDays: number | null }
interface ShiftView { id: string; code: string; name: string; startLocal: string; endLocal: string; graceMinutes: number; region: "IN" | "US" }

export default function SettingsPage() {
  const { t, searchParams } = usePage();
  const tab = pick(searchParams, "tab", TABS, "access");

  return (
    <div className="col">
      <PageHeader eyebrow={t("Administration")} title={t("Rules &")} emphasis={t("settings")} sub={t("Who can see what, and the rules the portal runs on.")}>
        <SegmentedFilter name="tab" dflt="access" label={t("Policy section")} options={[{ value: "access", label: t("Access") }, { value: "leave", label: t("Leave policy") }, { value: "holidays", label: t("Holidays") }, { value: "attendance", label: t("Attendance") }]} />
      </PageHeader>
      {tab === "access" && <AccessMatrix />}
      {tab === "leave" && <LeavePolicy />}
      {tab === "holidays" && <HolidayList />}
      {tab === "attendance" && <AttendancePolicy />}
    </div>
  );
}

function AccessMatrix() {
  const t = useT();
  // already in the built-in order
  const roles = useData<{ id: string; key: string; name: string; perms: string[] }[]>("/api/v1/settings/access");
  if (!roles) return <PageLoading />;
  return (
    <>
      <p className="muted enter" style={{ margin: 0, fontSize: 13.5 }}>
        {t("Read-only summary generated from the roles table. Edit permissions in")} <Link href="/roles" style={{ color: "var(--accenttext)" }}>{t("Roles & permissions")}</Link>.
      </p>
      <section className="card enter">
        <div className="table-wrap">
          <table className="t matrix">
            <thead><tr><th>{t("Permission")}</th>{roles.map((r) => <th key={r.id}>{r.name}</th>)}</tr></thead>
            <tbody>
              {PERMISSIONS.map(([permission, label], i) => (
                <tr key={permission} style={{ animationDelay: `${i * 30}ms` }}>
                  <td><b style={{ fontWeight: 500 }}>{t(label)}</b></td>
                  {roles.map((role) => {
                    const yes = role.perms.includes(permission);
                    return <td key={role.id}><span className={yes ? "yes" : "no"} aria-label={yes ? t("Yes") : t("No")}>{yes ? "✓" : "—"}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function LeavePolicy() {
  const t = useT();
  const data = useData<{ types: LeaveTypeView[]; attendance: SettingValue<"attendance.policy"> }>("/api/v1/settings/leave");
  if (!data) return <PageLoading />;
  const { types, attendance: att } = data;
  const card = (leaveType: (typeof types)[number]): [string, string] => {
    if (leaveType.code === "LOP") return [t("Automatic"), t("Absent without leave · {n} late marks = ½ day · Gross ÷ days in month", { n: att.lateMarksPerHalfDayLop })];
    if (leaveType.code === "CO") return [t("On approval"), t("For holiday / weekend work of {h}h+ · expires in {d} days", { h: att.halfDayHours, d: leaveType.expiryDays ?? 60 })];
    const parts = [t("{n} per month", { n: num(leaveType.accrualPerMonth) }), num(leaveType.carryForwardCap) ? t("carry up to {n}", { n: num(leaveType.carryForwardCap) }) : t("no carry forward")];
    if (leaveType.maxStretch) parts.push(t("max {n} at a stretch", { n: num(leaveType.maxStretch) }));
    if (num(leaveType.encashPerYear)) parts.push(t("encash {n} a year after {m} months", { n: num(leaveType.encashPerYear), m: leaveType.encashAfterMonths }));
    return [t("{n} a year", { n: num(leaveType.annualQuota) }), parts.join(" · ")];
  };
  return (
    <div className="kpis">
      {types.map((leaveTypeEntry, i) => {
        const [eyebrow, text] = card(leaveTypeEntry);
        return (
          <div key={leaveTypeEntry.code} className="card pad lift enter" style={{ ["--i" as string]: i }}>
            <span className="spot"></span>
            <span className="eyebrow">{eyebrow}</span>
            <h3 className="display" style={{ fontSize: 26, margin: "6px 0" }}>{leaveTypeEntry.name}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{text}</p>
          </div>
        );
      })}
    </div>
  );
}

function HolidayList() {
  const t = useT();
  const year = Number(todayIn(useCurrentUser().user?.timeZone ?? INDIA_TIME_ZONE).slice(0, 4));
  const hol = useData<{ id: string; date: string; name: string; region: "IN" | "US" | "ALL" }[]>(`/api/v1/settings/holidays?year=${year}`);
  if (!hol) return <PageLoading />;
  return (
    <section className="card pad enter">
      <div className="list">
        {hol.map((holiday) => {
          const isoDate = holiday.date;
          return (
            <div className="it" key={holiday.id}>
              <span className="hol-date"><b>{Number(isoDate.slice(8))}</b><small>{MONTH_ABBREVIATIONS[Number(isoDate.slice(5, 7)) - 1].toUpperCase()}</small></span>
              <div style={{ flex: 1 }}><b style={{ fontWeight: 600 }}>{holiday.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{formatWeekdayDayMonthYear(isoDate)}</div></div>
              <span className={`chip nodot ${holiday.region === "US" ? "info" : holiday.region === "ALL" ? "ok" : "gold"}`}>{holiday.region === "ALL" ? t("Everyone") : holiday.region === "US" ? t("US") : t("India")}</span>
            </div>
          );
        })}
        {!hol.length && <div className="faint">{t("No holidays for {year} yet.", { year })}</div>}
      </div>
    </section>
  );
}

function AttendancePolicy() {
  const translate = useT();
  const data = useData<{ policy: SettingValue<"attendance.policy">; shifts: ShiftView[]; locked: boolean }>("/api/v1/settings/attendance");
  if (!data) return <PageLoading />;
  const { policy: attendancePolicy, shifts, locked } = data;
  const grc = shifts[0]?.graceMinutes ?? attendancePolicy.graceMinutes;
  const formatClockTime = (clockTime: string) => { const [hours, minutes] = clockTime.split(":").map(Number); return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`; };
  const grace = (startTime: string, graceMinutesToAdd: number) => { const [startHours, startMinutes] = startTime.split(":").map(Number); const totalMinutes = startHours * 60 + startMinutes + graceMinutesToAdd; return formatClockTime(`${Math.floor(totalMinutes / 60) % 24}:${totalMinutes % 60}`); };
  const days = [translate("Sunday"), translate("Monday"), translate("Tuesday"), translate("Wednesday"), translate("Thursday"), translate("Friday"), translate("Saturday")];
  return (
    <>
    <AttendancePolicyForm locked={locked} initial={{ fullDayHours: attendancePolicy.fullDayHours, halfDayHours: attendancePolicy.halfDayHours, graceMinutes: grc, lateMarksPerHalfDayLop: attendancePolicy.lateMarksPerHalfDayLop, weeklyOffs: attendancePolicy.weeklyOffs, absenceJobBufferMinutes: attendancePolicy.absenceJobBufferMinutes, lockDayOfNextMonth: attendancePolicy.lockDayOfNextMonth, lockTime: attendancePolicy.lockTime, trackingStartDate: attendancePolicy.trackingStartDate }} />
    <section className="card pad enter">
      {shifts.map((shift) => (
        <div className="kv" key={shift.id}><span className="muted">{translate("{name} shift", { name: shift.name })}</span><b>{formatClockTime(shift.startLocal)} – {formatClockTime(shift.endLocal)}{shift.region === "US" ? ` ${translate("local")}` : " IST"} · {translate("grace till {time}", { time: grace(shift.startLocal, shift.graceMinutes) })}</b></div>
      ))}
      <div className="kv"><span className="muted">{translate("Full day / half day")}</span><b>{translate("{full}h+ / {half}h – {full}h worked", { full: attendancePolicy.fullDayHours, half: attendancePolicy.halfDayHours })}</b></div>
      <div className="kv"><span className="muted">{translate("Late marks")}</span><b>{translate("Every check-in after grace · {n} in a month = ½ day loss of pay", { n: attendancePolicy.lateMarksPerHalfDayLop })}</b></div>
      <div className="kv"><span className="muted">{translate("Weekly off")}</span><b>{attendancePolicy.weeklyOffs.map((dayIndex) => days[dayIndex]).join(" & ")}</b></div>
      <div className="kv"><span className="muted">{translate("Monthly attendance lock")}</span><b>{translate("{day} of next month, {time} IST", { day: attendancePolicy.lockDayOfNextMonth === 1 ? translate("1st") : translate("Day {n}", { n: attendancePolicy.lockDayOfNextMonth }), time: formatClockTime(attendancePolicy.lockTime) })}</b></div>
      <div className="kv"><span className="muted">{translate("US team")}</span><b>{translate("Day shift, local time · holidays from the US calendar")}</b></div>
      <div className="kv"><span className="muted">{translate("Regularization approvers")}</span><b>{translate("HR, Finance or Admin — the first decision counts")}</b></div>
      <div className="kv"><span className="muted">{translate("Admin accounts")}</span><b>{translate("No attendance or leave tracking")}</b></div>
      <div className="kv"><span className="muted">{translate("Salary visibility")}</span><b>{translate("Finance & Admin; employees see their own payslip")}</b></div>
    </section>
    </>
  );
}

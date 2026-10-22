import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pending, SegmentedFilter, SortableHeader } from "@/components/table/Table";
import { toQueryString } from "@/lib/api";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonth, formatWeekdayDayMonthYear, MONTH_ABBREVIATIONS } from "@/lib/format";
import { ApplyButton, CancelLeave } from "./LeaveClient";


const STATUS = ["All", "PENDING", "APPROVED", "DECLINED", "CANCELLED"] as const;
const SLABEL: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", DECLINED: "Declined", CANCELLED: "Cancelled" };
const SCHIP: Record<string, string> = { PENDING: "warn", APPROVED: "ok", DECLINED: "bad", CANCELLED: "neutral" };
const PART: Record<string, string> = { FULL: "Full day", FIRST_HALF: "First half", SECOND_HALF: "Second half" };

function Ring({ value, max, color, animationIndex: i }: { value: number; max: number; color: string; animationIndex: number }) {
  const RING_CIRCUMFERENCE = 207;
  const frac = Math.min(1, Math.max(0.03, max ? value / max : 0));
  return (
    <div className="ring">
      <svg width="78" height="78" viewBox="0 0 78 78" aria-hidden="true">
        <circle cx="39" cy="39" r="33" stroke="var(--line)" strokeWidth="6" fill="none"></circle>
        <circle cx="39" cy="39" r="33" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" transform="rotate(-90 39 39)" className="ring-arc" style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: RING_CIRCUMFERENCE * (1 - frac), animationDelay: `${i * 0.12}s` }}></circle>
      </svg>
      <b>{Number.isInteger(value) ? value : value.toFixed(2)}</b>
    </div>
  );
}

export default function LeavePage() {
  const { t, searchParams } = usePage();
  const data = useData<{
    tab: "requests" | "holidays"; status: (typeof STATUS)[number]; today: string; year: string; canApply: boolean; lopYear: number;
    balances: { code: string; name: string; balance: number; pending: number; paid: boolean; needsBalance: boolean; annual: number }[];
    requests: { id: string; typeName: string; leaveType: string; from: string; to: string; part: string; days: number; lopDays: number; applied: string; reason: string | null; status: string; decidedBy: string | null }[];
    holidays: { id: string; date: string; name: string }[]; holidayMap: Record<string, string>;
    types: { code: string; name: string; paid: boolean; available: number | null; lockedReason: string | null }[]; weeklyOffs: number[];
  }>(`/api/leave${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { tab, status, today, year, balances, requests, holidays, holidayMap, types, lopYear } = data;

  const bal = (leaveCode: string) => balances.find((b) => b.code === leaveCode);
  const avail = (leaveCode: string) => { const balance = bal(leaveCode); return balance ? Math.round((balance.balance - balance.pending) * 100) / 100 : 0; };
  const rings: [string, number, number, string, string][] = [
    [t("Casual leave"), avail("CL"), bal("CL")?.annual || 12, "#6E56CF", t("Accrues 1 a month")],
    [t("Earned leave"), avail("EL"), bal("EL")?.annual || 18, "#17834F", t("Carry up to 30 · encashable")],
    [t("Comp-off"), avail("CO"), 5, "#0A6BC2", t("For holiday work · 60 days")],
    [t("Loss of pay"), lopYear, 5, "#CF3A40", t("Taken in {year}", { year })],
  ];

  return (
    <div className="col" style={{ gap: 24 }}>
      <PageHeader eyebrow={t("Leave · {year}", { year })} title={t("Time away,")} emphasis={t("well planned")} sub={t("Apply in three steps — leave type, dates, and an optional reason.")}>
        {data.canApply && <ApplyButton types={types} today={today} holidays={holidayMap} weeklyOffs={data.weeklyOffs} autoOpen={searchParams.apply === "1"} />}
      </PageHeader>
      <div className="kpis">
        {rings.map(([name, available, max, color, note], i) => (
          <div className="card bal lift enter" key={name} style={{ ["--i" as string]: i + 1 }}>
            <span className="spot" aria-hidden="true"></span>
            <Ring value={available} max={max} color={color} animationIndex={i} />
            <div><b style={{ fontSize: 15 }}>{name}</b><div className="faint" style={{ fontSize: 12.5, marginTop: 4 }}>{note}</div></div>
          </div>
        ))}
      </div>
      <SegmentedFilter name="tab" dflt="requests" label={t("Leave section")} options={[{ value: "requests", label: t("My requests") }, { value: "holidays", label: t("Holiday calendar") }]} />
      {tab === "requests" ? (
        <>
          <div className="toolbar enter" style={{ ["--i" as string]: 6 }}>
            <SegmentedFilter name="status" dflt="All" label={t("Status")} options={STATUS.map((option) => ({ value: option, label: option === "All" ? t("All") : t(SLABEL[option]) }))} />
            <span className="tcount">{t("{n} requests", { n: requests.length })}</span>
          </div>
          <section className="card enter" style={{ ["--i" as string]: 6 }}>
            <Pending>
              <div className="table-wrap">
                <table className="t">
                  <thead><tr>
                    <SortableHeader sortKey="type" dflt="applied" dfltDir="desc">{t("Type")}</SortableHeader>
                    <SortableHeader sortKey="from" dflt="applied" dfltDir="desc">{t("Dates")}</SortableHeader>
                    <SortableHeader sortKey="days" dflt="applied" dfltDir="desc">{t("Days")}</SortableHeader>
                    <SortableHeader sortKey="applied" dflt="applied" dfltDir="desc">{t("Applied")}</SortableHeader>
                    <th>{t("Reason")}</th>
                    <SortableHeader sortKey="status" dflt="applied" dfltDir="desc">{t("Status")}</SortableHeader>
                    <th><span className="sr-only">{t("Actions")}</span></th>
                  </tr></thead>
                  <tbody>
                    {requests.map((request, i) => {
                      const startDate = request.from, endDate = request.to;
                      return (
                        <tr key={request.id} style={{ animationDelay: `${i * 50}ms` }}>
                          <td><b>{t(request.typeName)}</b></td>
                          <td>{formatDayMonth(startDate)}{endDate !== startDate ? ` – ${formatDayMonth(endDate)}` : ""}<div className="faint" style={{ fontSize: 12 }}>{t(PART[request.part])}{request.lopDays > 0 && request.leaveType !== "LOP" ? ` · ${t("{n}d unpaid", { n: request.lopDays })}` : ""}</div></td>
                          <td className="num">{request.days}</td>
                          <td className="muted">{formatDayMonth(request.applied)}</td>
                          <td className="muted" style={{ maxWidth: 240 }}>{request.reason || "—"}</td>
                          <td><span className={`chip ${SCHIP[request.status]}`}>{t(SLABEL[request.status])}</span>{request.decidedBy && <div className="faint" style={{ fontSize: 11.5, marginTop: 3 }}>{t("by {name}", { name: request.decidedBy })}</div>}</td>
                          <td className="r">{request.status === "PENDING" && <CancelLeave id={request.id} />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!requests.length && <div className="empty"><b>{t("No requests")}</b><span className="muted">{status === "All" ? t("You haven't applied for leave yet.") : t("Nothing with this status.")}</span>{status !== "All" && <ClearFilters />}</div>}
            </Pending>
          </section>
        </>
      ) : (
        <section className="kpis enter" style={{ ["--i" as string]: 6 }}>
          {holidays.map((holiday, i) => {
            const isoDate = holiday.date;
            const past = isoDate < today;
            return (
              <div className="card pad lift" key={holiday.id} style={{ opacity: past ? 0.5 : 1, animation: `enter .6s ${i * 50}ms both`, display: "flex", gap: 14, alignItems: "center" }}>
                <span className="spot" aria-hidden="true"></span>
                <span className="hol-date"><b>{Number(isoDate.slice(8))}</b><small>{MONTH_ABBREVIATIONS[Number(isoDate.slice(5, 7)) - 1].toUpperCase()}</small></span>
                <div><b>{holiday.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{past ? t("{date} · passed", { date: formatWeekdayDayMonthYear(isoDate) }) : formatWeekdayDayMonthYear(isoDate)}</div></div>
              </div>
            );
          })}
          {!holidays.length && <div className="empty"><b>{t("No holidays yet")}</b><span className="muted">{t("HR hasn't published this year's calendar.")}</span></div>}
        </section>
      )}
    </div>
  );
}

import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pending, SearchBox, SortableHeader } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { WEEKDAY_ABBREVIATIONS, formatDayMonth, isoToDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";


type TodayStatus = { label: string; tone: "ok" | "info" | "warn" | "gold" | "neutral" };
type Team = {
  size: number; counts: { in: number; leave: number; notIn: number };
  rows: { id: string; photo?: number | null; code: string; fullName: string; designation: string; shift: string; status: TodayStatus }[];
  days: string[]; away: { id: string; fullName: string; cells: ("" | "lv" | "pend" | "hol")[] }[];
};

/** Anyone with active direct reports. Read-only — approvals stay with HR (REQUIREMENTS §5.13). */
export default function TeamPage() {
  const { t, searchParams } = usePage();
  const data = useData<Team>(`/api/team${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { size, counts, rows, days, away } = data;

  return (
    <div className="col" style={{ gap: 24 }}>
      <PageHeader eyebrow={t("My team")} title={t("Your")} em={t("team")} after={` ${t("today")}`} sub={t("People who report to you. Approvals are handled by HR.")} />
      <div className="kpis">
        <div className="card kpi enter" style={{ ["--i" as string]: 1 }}><span className="spot"></span><span className="l">{t("Team size")}</span><span className="v num">{size}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 2 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--ok)" }}></i> {t("Checked in")}</span><span className="v num">{counts.in}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 3 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--info)" }}></i> {t("On leave")}</span><span className="v num">{counts.leave}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 4 }}><span className="spot"></span><span className="l"><i className="dot" style={{ color: "var(--warn)" }}></i> {t("Not in yet")}</span><span className="v num">{counts.notIn}</span></div>
      </div>
      <div className="toolbar enter" style={{ ["--i" as string]: 5 }}>
        <SearchBox placeholder={t("Search your team")} label={t("Search team")} />
        <span className="tcount">{t("{n} of {total}", { n: rows.length, total: size })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 5 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader k="name" dflt="name">{t("Member")}</SortableHeader>
                  <SortableHeader k="id" dflt="name">{t("ID")}</SortableHeader>
                  <SortableHeader k="title" dflt="name">{t("Designation")}</SortableHeader>
                  <th>{t("Shift")}</th>
                  <SortableHeader k="status" dflt="name">{t("Today")}</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={m.id} style={{ animationDelay: `${i * 50}ms` }}>
                    <td><div className="person"><Avatar id={m.id} name={m.fullName} photo={m.photo} /><div><b>{m.fullName}</b><small>{m.designation}</small></div></div></td>
                    <td className="muted num">{m.code}</td>
                    <td className="muted">{m.designation}</td>
                    <td className="muted">{m.shift}</td>
                    <td><span className={`chip ${m.status.tone}`}>{t(m.status.label)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="empty"><b>{t("No one matches")}</b><span className="muted">{t("Try another name.")}</span><ClearFilters /></div>}
        </Pending>
      </section>
      <section className="card pad enter" style={{ ["--i" as string]: 6 }}>
        <span className="spot"></span>
        <div className="card-h">
          <h3>{t("Who's away · week of {date}", { date: formatDayMonth(days[0]) })}</h3>
          <span className="row" style={{ gap: 12, fontSize: 12 }}><span className="chip info">{t("Approved leave")}</span><span className="chip warn">{t("Pending")}</span><span className="chip gold">{t("Holiday")}</span></span>
        </div>
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 640 }}>
            <thead><tr><th>{t("Member")}</th>{days.map((d) => <th key={d} style={{ textAlign: "center" }}>{t(WEEKDAY_ABBREVIATIONS[isoToDate(d).getUTCDay()])} {Number(d.slice(8))}</th>)}</tr></thead>
            <tbody>
              {away.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.fullName}</b></td>
                  {r.cells.map((c, j) => (
                    <td key={j} style={{ textAlign: "center" }}>
                      {c ? <span className={`chip ${{ lv: "info", pend: "warn", hol: "gold" }[c]}`}>{{ lv: t("Leave"), pend: t("Pending"), hol: t("Holiday") }[c]}</span> : <span className="faint">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

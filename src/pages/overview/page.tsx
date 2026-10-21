import Link from "@/lib/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { allowedNav, can } from "@/lib/session";
import { PageLoading, useData, usePage } from "@/lib/page";
import { AnnouncementsCard } from "@/components/home/AnnouncementsCard";
import { NotificationsCard } from "@/components/home/NotificationList";
import type { Announcement, InboxPage } from "@/lib/api-types";
import { formatWeekdayDayMonthYear, formatRupees, todayIn, formatMonthLabel } from "@/lib/format";


type Overview = {
  headcount: number; india: number; us: number; accessOff: number; departmentCount: number; checkedInNow: number;
  pending: { leave: number; regularizations: number; proofs: number };
  payroll: { month: string; status: "Closed" | "Approved" | "In review"; lastClosed: string | null; net: number; people: number; noStructure: number };
  byDepartment: { name: string; count: number }[];
};

export default function OverviewPage() {
  const { user, t } = usePage();
  const data = useData<Overview>("/api/overview");
  const box = useData<InboxPage>("/api/notifications?limit=5");
  const news = useData<Announcement[]>("/api/announcements?limit=3");
  if (!data || !box || !news) return <PageLoading />;
  const pending = data.pending.leave + data.pending.regularizations;
  const maxDept = Math.max(1, ...data.byDepartment.map((x) => x.count));
  const pay = data.payroll;
  const chip = pay.status === "Closed" ? "ok" : "warn";

  return (
    <div className="col">
      <PageHeader eyebrow={`${formatWeekdayDayMonthYear(todayIn(user.timeZone))} · ${t("Administration")}`} title={t("Company")} em={t("overview")} sub={t("Everything HR and Finance are working on, in one place.")}>
        <Link className="btn" href="/register"><Icon n="grid" s={15} />{t("Attendance register")}</Link>
        <Link className="btn" href="/employees"><Icon n="users" s={15} />{t("Employees")}</Link>
        {can(user, "pay.view") && <Link className="btn btn-gold" href="/payroll"><Icon n="wallet" s={15} />{t("Open payroll")}</Link>}
      </PageHeader>

      <div className="kpis">
        <div className="card kpi lift enter" style={{ ["--i" as string]: 1 }}><span className="spot"></span><span className="ico" style={{ background: "var(--accentsoft)", color: "var(--accent)" }}><Icon n="users" s={16} /></span><span className="l">{t("Headcount")}</span><span className="v num">{data.headcount}</span><span className="s">{t("{india} India · {us} US", { india: data.india, us: data.us })}{data.accessOff ? ` · ${t("{n} access off", { n: data.accessOff })}` : ""}</span></div>
        <div className="card kpi lift enter" style={{ ["--i" as string]: 2 }}><span className="spot"></span><span className="ico" style={{ background: "var(--okbg)", color: "var(--ok)" }}><Icon n="clock" s={16} /></span><span className="l">{t("Checked in now")}</span><span className="v num">{data.checkedInNow}</span><span className="s">{t("India + US teams")} · <Link href="/register" style={{ color: "inherit" }}>{t("see times")}</Link></span></div>
        <div className="card kpi lift enter" style={{ ["--i" as string]: 3 }}><span className="spot"></span><span className="ico" style={{ background: "var(--warnbg)", color: "var(--warn)" }}><Icon n="check" s={16} /></span><span className="l">{t("Pending approvals")}</span><span className="v num">{pending}</span><span className="s">{t("{leave} leave · {reg} attendance", { leave: data.pending.leave, reg: data.pending.regularizations })}</span></div>
        <div className="card kpi lift enter" style={{ ["--i" as string]: 4 }}><span className="spot"></span><span className="ico" style={{ background: "var(--infobg)", color: "var(--info)" }}><Icon n="inbox" s={16} /></span><span className="l">{t("Proofs to verify")}</span><span className="v num">{data.pending.proofs}</span><span className="s">{t("investment declarations")}</span></div>
      </div>

      <AnnouncementsCard items={news} i={5} />
      {(box.total > 0) && <NotificationsCard items={box.items} unread={box.unread} timeZone={user.timeZone} i={5} />}

      <div className="bento">
        <section className="card pad span-8 enter" style={{ ["--i" as string]: 5 }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("Payroll · {month}", { month: formatMonthLabel(pay.month) })}</h3><span className={`chip ${chip}`}>{pay.status === "Closed" ? t("Closed") : pay.status === "Approved" ? t("Approved") : t("In review")}</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span className="display num" style={{ fontSize: 48, lineHeight: 1 }}>{formatRupees(pay.net)}</span>
            <span className="muted">{t(pay.people === 1 ? "net payout · {n} employee" : "net payout · {n} employees", { n: pay.people })}</span>
          </div>
          <p className="muted" style={{ margin: "12px 0 16px", fontSize: 13.5 }}>
            {pay.noStructure ? `${t(pay.noStructure === 1 ? "{n} employee has no salary structure yet." : "{n} employees have no salary structure yet.", { n: pay.noStructure })} ` : ""}
            {pay.status === "Closed" ? t("Payslips are published to employees.") : t("Payslips are published to employees as soon as Finance closes payroll.")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {can(user, "pay.view") && <Link className="btn btn-gold" href="/payroll">{t("Review payroll")}</Link>}
            {can(user, "struct.manage") && <Link className="btn" href="/structures">{t("Salary structures")}</Link>}
            {can(user, "tax.view") && <Link className="btn" href="/tax">{t("Tax & TDS")}</Link>}
          </div>
        </section>

        <section className="card pad span-4 enter" style={{ ["--i" as string]: 6 }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("People by department")}</h3><Link className="btn btn-sm btn-ghost" href="/departments">{t("Manage")}</Link></div>
          <div className="list">
            {data.byDepartment.map((x) => (
              <div className="it" key={x.name}>
                <span style={{ flex: 1, minWidth: 0 }}>{x.name}</span>
                <span style={{ width: 90, height: 6, borderRadius: 9, background: "var(--hover)", overflow: "hidden" }} aria-hidden="true"><i style={{ display: "block", height: "100%", width: `${(x.count / maxDept) * 100}%`, background: "var(--accentgrad)" }}></i></span>
                <b className="num" style={{ width: 28, textAlign: "right" }}>{x.count}</b>
              </div>
            ))}
            {!data.byDepartment.length && <div className="faint" style={{ fontSize: 13 }}>{t("No departments yet.")}</div>}
          </div>
        </section>

        <section className="card pad span-6 enter" style={{ ["--i" as string]: 7 }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("HR queue")}</h3>{can(user, "appr.leave", "appr.reg") && <Link className="btn btn-sm btn-ghost" href="/approvals">{t("Open")}</Link>}</div>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            {pending ? t("{leave} and {reg} are waiting.", { leave: t(data.pending.leave === 1 ? "{n} leave request" : "{n} leave requests", { n: data.pending.leave }), reg: t(data.pending.regularizations === 1 ? "{n} regularization" : "{n} regularizations", { n: data.pending.regularizations }) }) : t("No leave or attendance requests are waiting.")} {t("Leave is approved by HR; regularizations can be approved by HR, Finance or Admin — the first decision wins.")}
          </p>
        </section>

        <section className="card pad span-6 enter" style={{ ["--i" as string]: 8 }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("Finance queue")}</h3>{can(user, "proofs.verify") && <Link className="btn btn-sm btn-ghost" href="/proofs">{t("Open")}</Link>}</div>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            {data.pending.proofs ? t(data.pending.proofs === 1 ? "{n} investment proof is pending verification." : "{n} investment proofs are pending verification.", { n: data.pending.proofs }) : t("No investment proofs are waiting.")} {t("Approved proofs reduce TDS from the next payroll.")}
          </p>
        </section>

        <section className="card pad span-12 enter" style={{ ["--i" as string]: 9 }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("Shortcuts")}</h3></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {allowedNav(user).filter((n) => n.group && n.group !== "Team").map((n) => <Link key={n.id} className="btn" href={`/${n.id}`}><Icon n={n.icon} s={15} />{t(n.label)}</Link>)}
          </div>
        </section>
      </div>
    </div>
  );
}

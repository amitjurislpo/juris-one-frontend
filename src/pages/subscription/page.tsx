import { PageHeader } from "@/components/PageHeader";
import type { BusinessProfile, SubscriptionCurrent, SubscriptionRow } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear, formatRupees } from "@/lib/format";
import { MODULE_LABELS, subscriptionChip } from "@/lib/subscription";
import { ExportButtons } from "./ExportButtons";


interface Data { business: BusinessProfile; subscription: SubscriptionCurrent; history: SubscriptionRow[] }

/** The business owner's plan, its dates and the employee export (available even after the subscription ends). */
export default function SubscriptionPage() {
  const { t } = usePage();
  const data = useData<Data>("/api/business/subscription");
  if (!data) return <PageLoading />;
  const s = data.subscription;
  const chip = subscriptionChip(s);
  const chipText = s.state === "NONE" || !s ? t("No plan") : s.state === "UPCOMING" ? t("Starts {date}", { date: formatDayMonthYear(s.startsOn!) }) : s.state === "EXPIRED" ? t("Ended {date}", { date: formatDayMonthYear(s.endsOn!) }) : s.daysLeft !== null && s.daysLeft <= 7 ? (s.daysLeft === 0 ? t("Ends today") : t(s.daysLeft === 1 ? "{n} day left" : "{n} days left", { n: s.daysLeft })) : t("Until {date}", { date: formatDayMonthYear(s.endsOn!) });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="col">
      <PageHeader eyebrow={t("Administration")} title={<>{t("Subscription")}</>} sub={t("{name}'s JurisOne plan. Plans are renewed by the JurisOne team.", { name: data.business.name })}>
        <ExportButtons />
      </PageHeader>

      <div className="kpis enter" style={{ ["--i" as string]: 1 }}>
        <div className="card kpi"><span className="l">{t("Plan")}</span><span className="v" style={{ fontSize: 26 }}>{s.planName ?? t("None")}</span><span className={`chip ${chip.cls}`} style={{ alignSelf: "flex-start" }}>{chipText}</span></div>
        <div className="card kpi"><span className="l">{t("Valid until")}</span><span className="v" style={{ fontSize: 26 }}>{s.endsOn ? formatDayMonthYear(s.endsOn) : "—"}</span><span className="s">{s.startsOn ? t("from {date}", { date: formatDayMonthYear(s.startsOn) }) : ""}</span></div>
        <div className="card kpi"><span className="l">{t("People")}</span><span className="v num">{s.employees}</span><span className="s">{s.maxEmployees ? t("of {n} on this plan", { n: s.maxEmployees }) : t("no limit on this plan")}</span></div>
        <div className="card kpi"><span className="l">{t("Modules")}</span><span>{s.modules.length ? s.modules.map((m) => <span key={m} className="chip gold">{t(MODULE_LABELS[m] ?? m)}</span>) : <span className="muted">{t("Core HR")}</span>}</span></div>
      </div>

      {!s.active && (
        <div className="card enter" style={{ ["--i" as string]: 2, padding: 18, borderColor: "var(--bad)" }} role="alert">
          <b>{s.state === "UPCOMING" ? t("Your subscription starts on {date}.", { date: formatDayMonthYear(s.startsOn!) }) : t("Your subscription has ended.")}</b>
          <p className="muted" style={{ margin: "6px 0 0" }}>{t("Until it is active, everyone can sign in but JurisOne is paused for your business. You can still export your employees. Contact the JurisOne team to renew.")}</p>
        </div>
      )}

      <section className="card enter" style={{ ["--i" as string]: 3 }}>
        <div className="card-h" style={{ padding: "16px 18px 0" }}><h3>{t("History")}</h3></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Plan")}</th><th>{t("From")}</th><th>{t("To")}</th><th className="r">{t("Price")}</th><th>{t("Status")}</th></tr></thead>
            <tbody>
              {data.history.map((x) => (
                <tr key={x.id}>
                  <td><b>{x.planName}</b></td>
                  <td>{formatDayMonthYear(x.startsOn)}</td>
                  <td>{formatDayMonthYear(x.endsOn)}</td>
                  <td className="r num">{formatRupees(x.pricePaise)}</td>
                  <td>{x.status === "CANCELLED" ? <span className="chip neutral">{t("Cancelled")}</span> : x.endsOn < today ? <span className="chip neutral">{t("Ended")}</span> : x.startsOn > today ? <span className="chip info">{t("Upcoming")}</span> : <span className="chip ok">{t("Current")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.history.length && <div className="empty"><span className="muted">{t("No subscription yet.")}</span></div>}
      </section>
    </div>
  );
}

import { useState } from "react";
import Link from "@/lib/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type { PlanRow, RoleTemplates, SubscriptionCurrent } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear, isoDateIn } from "@/lib/format";
import { subscriptionChip } from "@/lib/subscription";
import { NewBusinessButton } from "./PlatformClient";


interface BusinessRow {
  id: string; name: string; code: string; employeePrefix: string; status: "ACTIVE" | "SUSPENDED"; employees: number; owners: number; createdAt: string;
  subscription: SubscriptionCurrent;
}

/** The super admin's console: every business on the platform. */
export default function PlatformPage() {
  const { user, t } = usePage();
  const rows = useData<BusinessRow[]>("/api/v1/platform/businesses");
  const plans = useData<PlanRow[]>("/api/v1/platform/plans");
  const catalogue = useData<RoleTemplates>("/api/v1/platform/role-templates");
  const [searchText, setSearchText] = useState("");
  if (!rows || !plans || !catalogue) return <PageLoading />;
  const chipText = (subscriptionState: SubscriptionCurrent) => !subscriptionState || subscriptionState.state === "NONE" ? t("No plan") : subscriptionState.state === "UPCOMING" ? t("Starts {date}", { date: formatDayMonthYear(subscriptionState.startsOn!) }) : subscriptionState.state === "EXPIRED" ? t("Ended {date}", { date: formatDayMonthYear(subscriptionState.endsOn!) }) : subscriptionState.daysLeft !== null && subscriptionState.daysLeft <= 7 ? (subscriptionState.daysLeft === 0 ? t("Ends today") : t(subscriptionState.daysLeft === 1 ? "{n} day left" : "{n} days left", { n: subscriptionState.daysLeft })) : t("Until {date}", { date: formatDayMonthYear(subscriptionState.endsOn!) });
  const needle = searchText.trim().toLowerCase();
  const shownRows = needle ? rows.filter((row) => row.name.toLowerCase().includes(needle) || row.code.toLowerCase().includes(needle)) : rows;
  const ending = rows.filter((r) => r.subscription.state === "ACTIVE" && (r.subscription.daysLeft ?? 99) <= 7).length;
  const lapsed = rows.filter((r) => !r.subscription.active).length;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Platform")} title={<>{t("Businesses")}</>} sub={t("Every business on JurisOne. Each one has its own people, policies, payroll and data.")}>
        <Link href="/platform/roles" className="btn btn-lg btn-ghost">{t("Role templates")}</Link>
        <NewBusinessButton plans={plans} templates={catalogue.templates} />
      </PageHeader>
      <div className="kpis enter" style={{ ["--i" as string]: 1 }}>
        <div className="card kpi"><span className="l">{t("Businesses")}</span><span className="v num">{rows.length}</span></div>
        <div className="card kpi"><span className="l">{t("People on the platform")}</span><span className="v num">{rows.reduce((total, row) => total + row.employees, 0)}</span></div>
        <div className="card kpi"><span className="l">{t("Ending within 7 days")}</span><span className="v num">{ending}</span></div>
        <div className="card kpi"><span className="l">{t("Without an active plan")}</span><span className="v num">{lapsed}</span></div>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        {rows.length > 1 && <div style={{ padding: "12px 16px 0" }}><input type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={t("Search by name or short name…")} aria-label={t("Search businesses")} style={{ maxWidth: 300 }} /></div>}
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>{t("Business")}</th>
                <th>{t("Plan")}</th>
                <th>{t("Subscription")}</th>
                <th className="r">{t("People")}</th>
                <th className="r hide-sm">{t("Sub admins")}</th>
                <th>{t("Status")}</th>
                <th className="hide-sm">{t("Created on")}</th>
              </tr>
            </thead>
            <tbody>
              {shownRows.map((row, i) => {
                const chip = subscriptionChip(row.subscription);
                return (
                  <tr key={row.id} style={{ animationDelay: `${i * 30}ms` }}>
                    <td>
                      <Link href={`/platform/${row.id}`} className="person" style={{ textDecoration: "none", color: "inherit" }}>
                        <span className="kpi-ico" style={{ width: 34, height: 34, background: "var(--accentsoft)", color: "var(--accent)" }}><Icon name="building" size={16} /></span>
                        <div><b>{row.name}</b><small>{t("{code} · IDs {prefix}-001", { code: row.code, prefix: row.employeePrefix })}</small></div>
                      </Link>
                    </td>
                    <td>{row.subscription.planName ?? <span className="muted">—</span>}</td>
                    <td><span className={`chip ${chip.className}`}>{chipText(row.subscription)}</span></td>
                    <td className="r num">{row.employees}{row.subscription.maxEmployees ? <span className="muted"> / {row.subscription.maxEmployees}</span> : null}</td>
                    <td className="r num hide-sm">{row.owners}</td>
                    <td><span className={`chip ${row.status === "ACTIVE" ? "ok" : "bad"}`}>{row.status === "ACTIVE" ? t("Active") : t("Suspended")}</span></td>
                    <td className="muted hide-sm">{formatDayMonthYear(isoDateIn(row.createdAt, user.timeZone))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && !shownRows.length && <div className="empty"><span className="muted">{t("No business matches your search.")}</span></div>}
        {!rows.length && (
          <div className="empty"><b className="display">{t("Welcome to JurisOne")}</b><span className="muted">{t("No businesses yet. Add your first one with “New business”, together with its sub admin, and you are ready to go.")}</span></div>
        )}
      </section>
    </div>
  );
}

import { PageHeader } from "@/components/PageHeader";
import type { PlanRow } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { inr } from "@/lib/format";
import { MODULE_LABELS } from "@/lib/subscription";
import { PlanButton } from "./PlansClient";


/** The super admin's plan catalogue: what a business can subscribe to. */
export default function PlansPage() {
  const { t } = usePage();
  const plans = useData<PlanRow[]>("/api/platform/plans");
  if (!plans) return <PageLoading />;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Platform")} title={<>{t("Subscription")} <em>{t("plans")}</em></>} sub={t("Plans you assign to businesses. Changing a plan applies to every business on it; the price charged is kept per subscription.")}>
        <PlanButton />
      </PageHeader>
      <section className="card enter" style={{ ["--i" as string]: 1 }}>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>{t("Plan")}</th><th className="r">{t("Price")}</th><th>{t("Period")}</th><th>{t("People")}</th><th>{t("Modules")}</th><th className="r">{t("Businesses")}</th><th>{t("Status")}</th><th></th></tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b>{p.description && <><br /><small className="muted">{p.description}</small></>}</td>
                  <td className="r num">{inr(p.pricePaise)}</td>
                  <td>{t(p.periodMonths === 1 ? "{n} month" : "{n} months", { n: p.periodMonths })}</td>
                  <td>{p.maxEmployees ? t("Up to {n}", { n: p.maxEmployees }) : t("No limit")}</td>
                  <td>{p.modules.length ? p.modules.map((m) => <span key={m} className="chip gold">{t(MODULE_LABELS[m] ?? m)}</span>) : <span className="muted">{t("Core HR")}</span>}</td>
                  <td className="r num">{p.businesses}</td>
                  <td><span className={`chip ${p.active ? "ok" : "neutral"}`}>{p.active ? t("Offered") : t("Retired")}</span></td>
                  <td className="r"><PlanButton plan={p} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!plans.length && <div className="empty"><b className="display">{t("No plans yet")}</b><span className="muted">{t("Create a plan before giving a business its subscription.")}</span></div>}
      </section>
    </div>
  );
}

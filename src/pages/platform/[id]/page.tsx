import Link from "@/lib/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type { BusinessProfile, ModuleGrant, PlanRow, RoleTemplates, SubscriptionCurrent, SubscriptionRow } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear, formatRupees, isoDateIn, todayIn } from "@/lib/format";
import { MODULE_LABELS, subscriptionChip } from "@/lib/subscription";
import {
  AddBusinessRoleButton, AddOwnerButton, AddSubscriptionButton, BusinessRoleActions, BusinessStatusButton, CancelSubscriptionButton, EditBusinessButton, GrantJurisTrackButton, OwnerAccessSwitch,
  RevokeGrantButton,
} from "../PlatformClient";


interface Detail {
  business: BusinessProfile & { id: string; status: "ACTIVE" | "SUSPENDED"; createdAt: string };
  owners: { id: string; code: string; name: string; email: string; access: boolean; status: string }[];
  subscription: SubscriptionCurrent;
  subscriptions: SubscriptionRow[];
  modules: ModuleGrant[];
  roles: { id: string; key: string; name: string; employees: number; mandatory: boolean }[];
}

const GRANT_STATE: Record<ModuleGrant["state"], { cls: string; text: string }> = {
  ACTIVE: { cls: "ok", text: "Active" }, UPCOMING: { cls: "info", text: "Upcoming" }, ENDED: { cls: "neutral", text: "Ended" }, REVOKED: { cls: "neutral", text: "Revoked" },
};

/** One business: its details, sub admins and subscription periods. */
export default function BusinessPage() {
  const { t, params } = usePage();
  const { id } = params;
  const data = useData<Detail>(`/api/v1/platform/businesses/${encodeURIComponent(id)}`);
  const plans = useData<PlanRow[]>("/api/v1/platform/plans");
  const catalogue = useData<RoleTemplates>("/api/v1/platform/role-templates");
  if (!data || !plans || !catalogue) return <PageLoading />;
  const business = data.business;
  const subscription = data.subscription;
  const chip = subscriptionChip(subscription);
  const chipText = (subscriptionState: SubscriptionCurrent) => !subscriptionState || subscriptionState.state === "NONE" ? t("No plan") : subscriptionState.state === "UPCOMING" ? t("Starts {date}", { date: formatDayMonthYear(subscriptionState.startsOn!) }) : subscriptionState.state === "EXPIRED" ? t("Ended {date}", { date: formatDayMonthYear(subscriptionState.endsOn!) }) : subscriptionState.daysLeft !== null && subscriptionState.daysLeft <= 7 ? (subscriptionState.daysLeft === 0 ? t("Ends today") : t(subscriptionState.daysLeft === 1 ? "{n} day left" : "{n} days left", { n: subscriptionState.daysLeft })) : t("Until {date}", { date: formatDayMonthYear(subscriptionState.endsOn!) });
  const planHasTrack = !!subscription.planName && (plans.find((candidatePlan) => candidatePlan.name === subscription.planName)?.modules.includes("JURIS_TRACK") ?? false);
  const today = todayIn(business.timeZone);
  const profile: BusinessProfile = {
    name: business.name, legalName: business.legalName, code: business.code, employeePrefix: business.employeePrefix, gstin: business.gstin, address: business.address,
    contactEmail: business.contactEmail, contactPhone: business.contactPhone, timeZone: business.timeZone,
  };

  return (
    <div className="col">
      <PageHeader back="/platform" eyebrow={<><Link href="/platform" className="linkish">{t("Businesses")}</Link> / {business.code}</>} title={business.name}
        sub={<>{t("Created {date} · employee IDs {prefix}-001 · {tz}", { date: formatDayMonthYear(isoDateIn(business.createdAt, business.timeZone)), prefix: business.employeePrefix, tz: business.timeZone })}</>}>
        <EditBusinessButton id={business.id} profile={profile} hasPeople={subscription.employees > 0} />
        <BusinessStatusButton id={business.id} name={business.name} status={business.status} />
      </PageHeader>

      <div className="kpis enter" style={{ ["--i" as string]: 1 }}>
        <div className="card kpi"><span className="l">{t("Status")}</span><span><span className={`chip ${business.status === "ACTIVE" ? "ok" : "bad"}`}>{business.status === "ACTIVE" ? t("Active") : t("Suspended")}</span></span></div>
        <div className="card kpi"><span className="l">{t("Plan")}</span><span className="v" style={{ fontSize: 24 }}>{subscription.planName ?? t("None")}</span><span className={`chip ${chip.className}`} style={{ alignSelf: "flex-start" }}>{chipText(subscription)}</span></div>
        <div className="card kpi"><span className="l">{t("People")}</span><span className="v num">{subscription.employees}{subscription.maxEmployees ? <span className="muted" style={{ fontSize: 18 }}> / {subscription.maxEmployees}</span> : null}</span></div>
        <div className="card kpi"><span className="l">{t("Modules")}</span><span>{subscription.modules.length ? subscription.modules.map((moduleName) => <span key={moduleName} className="chip gold" style={{ marginRight: 6 }}>{t(MODULE_LABELS[moduleName] ?? moduleName)}</span>) : <span className="muted">{t("Core HR only")}</span>}</span></div>
      </div>

      <div className="grid2 enter" style={{ ["--i" as string]: 2, alignItems: "start" }}>
        <section className="card" style={{ padding: 18 }}>
          <div className="card-h"><h3>{t("Sub admins")}</h3><AddOwnerButton id={business.id} /></div>
          {data.owners.map((owner) => (
            <div key={owner.id} className="kv" style={{ alignItems: "center" }}>
              <span><b>{owner.name}</b> <span className="muted mono" style={{ fontSize: 12 }}>{owner.code}</span><br /><small className="muted">{owner.email}</small></span>
              <OwnerAccessSwitch businessId={business.id} ownerId={owner.id} name={owner.name} isEnabled={owner.access} />
            </div>
          ))}
          {!data.owners.length && <p className="muted">{t("No sub admin yet — add one so someone can run this business.")}</p>}
        </section>

        <section className="card" style={{ padding: 18 }}>
          <div className="card-h"><h3>{t("Business details")}</h3></div>
          <div className="kv"><span className="muted">{t("Legal name")}</span><b>{business.legalName ?? "—"}</b></div>
          <div className="kv"><span className="muted">{t("GSTIN")}</span><b className="mono">{business.gstin ?? "—"}</b></div>
          <div className="kv"><span className="muted">{t("Contact")}</span><b>{[business.contactEmail, business.contactPhone].filter(Boolean).join(" · ") || "—"}</b></div>
          <div className="kv"><span className="muted">{t("Address")}</span><b style={{ textAlign: "right" }}>{business.address ?? "—"}</b></div>
        </section>
      </div>

      <section className="card enter" style={{ ["--i" as string]: 3, padding: 18 }}>
        <div className="card-h">
          <div>
            <h3>{t("Roles")}</h3>
            <small className="muted">{t("What people in this business can be. The business admin can't create roles; they work with these.")}</small>
          </div>
          <AddBusinessRoleButton businessId={business.id} templates={catalogue.templates.filter((availableTemplate) => availableTemplate.active && !data.roles.some((existingRole) => existingRole.key === availableTemplate.key))} />
        </div>
        {data.roles.map((role) => (
          <div key={role.id} className="kv" style={{ alignItems: "center" }}>
            <span><b>{role.name}</b>{role.mandatory && <> <span className="chip neutral">{t("Always included")}</span></>}<br /><small className="muted">{role.employees === 1 ? t("1 person") : t("{n} people", { n: role.employees })}</small></span>
            <span style={{ display: "flex", gap: 6 }}><BusinessRoleActions businessId={business.id} role={role} /></span>
          </div>
        ))}
      </section>

      <section className="card enter" style={{ ["--i" as string]: 3 }}>
        <div className="card-h" style={{ padding: "16px 18px 0" }}>
          <div>
            <h3>{t("Juris Track")}</h3>
            <small className="muted">{planHasTrack ? t("Included in the {plan} plan. You can also grant it on its own.", { plan: subscription.planName! }) : t("Not in the plan. Grant it on its own: complimentary or paid.")}</small>
          </div>
          <GrantJurisTrackButton id={business.id} />
        </div>
        {data.modules.length > 0 ? (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>{t("Type")}</th><th>{t("From")}</th><th>{t("To")}</th><th className="r">{t("Price")}</th><th>{t("Status")}</th><th className="hide-sm">{t("Notes")}</th><th></th></tr></thead>
              <tbody>
                {data.modules.map((grant) => (
                  <tr key={grant.id}>
                    <td><b>{grant.source === "PAID" ? t("Paid") : t("Complimentary")}</b></td>
                    <td>{formatDayMonthYear(grant.startsOn)}</td>
                    <td>{grant.endsOn ? formatDayMonthYear(grant.endsOn) : <span className="muted">{t("No end")}</span>}</td>
                    <td className="r num">{grant.source === "PAID" ? formatRupees(grant.pricePaise) : t("Free")}</td>
                    <td><span className={`chip ${GRANT_STATE[grant.state].cls}`}>{t(GRANT_STATE[grant.state].text)}</span></td>
                    <td className="muted hide-sm">{grant.notes ?? ""}</td>
                    <td className="r">{(grant.state === "ACTIVE" || grant.state === "UPCOMING") && <RevokeGrantButton businessId={business.id} grantId={grant.id} label={t(grant.source === "PAID" ? "paid Juris Track from {date}" : "complimentary Juris Track from {date}", { date: formatDayMonthYear(grant.startsOn) })} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted" style={{ padding: "0 18px 16px", margin: 0 }}>{t("No separate grants.")}</p>}
      </section>

      <section className="card enter" style={{ ["--i" as string]: 4 }}>
        <div className="card-h" style={{ padding: "16px 18px 0" }}>
          <h3>{t("Subscriptions")}</h3>
          <AddSubscriptionButton id={business.id} plans={plans} label={subscription.state === "NONE" ? t("Add subscription") : t("Renew / add period")} />
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Plan")}</th><th>{t("From")}</th><th>{t("To")}</th><th className="r">{t("Price")}</th><th>{t("Status")}</th><th className="hide-sm">{t("Notes")}</th><th></th></tr></thead>
            <tbody>
              {data.subscriptions.map((subscriptionEntry) => {
                const covers = subscriptionEntry.status === "ACTIVE" && subscriptionEntry.startsOn <= today && subscriptionEntry.endsOn >= today;
                const past = subscriptionEntry.endsOn < today;
                return (
                  <tr key={subscriptionEntry.id}>
                    <td><b>{subscriptionEntry.planName}</b></td>
                    <td>{formatDayMonthYear(subscriptionEntry.startsOn)}</td>
                    <td>{formatDayMonthYear(subscriptionEntry.endsOn)}</td>
                    <td className="r num">{formatRupees(subscriptionEntry.pricePaise)}</td>
                    <td>{subscriptionEntry.status === "CANCELLED" ? <span className="chip neutral">{t("Cancelled")}</span> : covers ? <span className="chip ok">{t("Current")}</span> : past ? <span className="chip neutral">{t("Ended")}</span> : <span className="chip info">{t("Upcoming")}</span>}</td>
                    <td className="muted hide-sm">{subscriptionEntry.notes ?? ""}</td>
                    <td className="r">{subscriptionEntry.status === "ACTIVE" && !past && <CancelSubscriptionButton businessId={business.id} subscriptionId={subscriptionEntry.id} label={t("{plan} ({from} – {to})", { plan: subscriptionEntry.planName, from: formatDayMonthYear(subscriptionEntry.startsOn), to: formatDayMonthYear(subscriptionEntry.endsOn) })} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data.subscriptions.length && <div className="empty"><Icon name="receipt" size={20} /><span className="muted">{t("No subscription yet. Until one starts, nobody in this business can sign in.")}</span></div>}
      </section>
    </div>
  );
}

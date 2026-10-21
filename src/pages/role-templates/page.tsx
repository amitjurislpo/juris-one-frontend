import Link from "@/lib/link";
import { PageHeader } from "@/components/PageHeader";
import type { RoleTemplates } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { RoleTemplateButton, RoleTemplateDeleteButton } from "./RoleTemplatesClient";

/** The super admin's role catalogue: the roles a business can be given when it is onboarded (or later). */
export default function RoleTemplatesPage() {
  const { t } = usePage();
  const data = useData<RoleTemplates>("/api/platform/role-templates");
  if (!data) return <PageLoading />;
  const labels = new Map(data.groups.flatMap((g) => g.permissions.map((p) => [p.key, p.label] as const)));
  const names = new Map(data.templates.map((x) => [x.key, x.name]));

  return (
    <div className="col">
      <PageHeader back="/platform" eyebrow={<><Link href="/platform" className="linkish">{t("Businesses")}</Link> / {t("Platform")}</>} title={<>{t("Role")} <em>{t("templates")}</em></>}
        sub={t("Roles you give to businesses. A business gets its own copy when the role is added; change a template, then use “Update from template” on a business to pass the change on.")}>
        <RoleTemplateButton groups={data.groups} templates={data.templates} />
      </PageHeader>
      <section className="card enter" style={{ ["--i" as string]: 1 }}>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>{t("Role")}</th><th>{t("What it can do")}</th><th>{t("Can add people as")}</th><th className="r">{t("Businesses")}</th><th>{t("Status")}</th><th></th></tr>
            </thead>
            <tbody>
              {data.templates.map((x) => (
                <tr key={x.key}>
                  <td>
                    <b>{x.name}</b>
                    {x.mandatory && <> <span className="chip gold">{t("Always included")}</span></>}
                    {x.locked && <> <span className="chip neutral">{t("Locked")}</span></>}
                  </td>
                  <td style={{ maxWidth: 360 }}><small className="muted">{x.permissions.map((p) => t(labels.get(p) ?? p)).join(" · ") || "—"}</small></td>
                  <td>{x.assignable.length ? x.assignable.map((k) => names.get(k) ?? k).join(", ") : <span className="muted">—</span>}</td>
                  <td className="r num">{x.businesses}</td>
                  <td><span className={`chip ${x.active ? "ok" : "neutral"}`}>{x.active ? t("Offered") : t("Retired")}</span></td>
                  <td className="r" style={{ whiteSpace: "nowrap" }}>
                    <RoleTemplateButton template={x} groups={data.groups} templates={data.templates} />
                    <RoleTemplateDeleteButton template={x} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

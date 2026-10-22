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
              {data.templates.map((template) => (
                <tr key={template.key}>
                  <td>
                    <b>{template.name}</b>
                    {template.mandatory && <> <span className="chip gold">{t("Always included")}</span></>}
                    {template.locked && <> <span className="chip neutral">{t("Locked")}</span></>}
                  </td>
                  <td style={{ maxWidth: 360 }}><small className="muted">{template.permissions.map((permission) => t(labels.get(permission) ?? permission)).join(" · ") || "—"}</small></td>
                  <td>{template.assignable.length ? template.assignable.map((roleKey) => names.get(roleKey) ?? roleKey).join(", ") : <span className="muted">—</span>}</td>
                  <td className="r num">{template.businesses}</td>
                  <td><span className={`chip ${template.active ? "ok" : "neutral"}`}>{template.active ? t("Offered") : t("Retired")}</span></td>
                  <td className="r" style={{ whiteSpace: "nowrap" }}>
                    <RoleTemplateButton template={template} groups={data.groups} templates={data.templates} />
                    <RoleTemplateDeleteButton template={template} />
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

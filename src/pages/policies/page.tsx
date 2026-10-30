import Link from "@/lib/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear, isoDateIn } from "@/lib/format";
import { NewPolicyButton } from "./PoliciesClient";


interface Row {
  id: string; title: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; version: number; requiresAcknowledgement: boolean; updatedAt: string; publishedAt: string | null;
  hasChanges: boolean; acknowledged: number; required: number;
}

const STATUS: Record<Row["status"], { cls: string; text: string }> = {
  DRAFT: { cls: "neutral", text: "Draft" }, PUBLISHED: { cls: "ok", text: "Published" }, ARCHIVED: { cls: "neutral", text: "Archived" },
};

/** HR / the owner: write and publish policies; see how many people have accepted each one. */
export default function PoliciesPage() {
  const { user, t } = usePage();
  const rows = useData<Row[]>("/api/v1/policies");
  if (!rows) return <PageLoading />;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Administration")} title={<>{t("Company")} <em>{t("policies")}</em></>}
        sub={t("Publish a policy and everyone (except owners) must read and accept it before using JurisOne. Each change is a new version; every acceptance is kept as a permanent record.")}>
        <NewPolicyButton />
      </PageHeader>
      <section className="card enter" style={{ ["--i" as string]: 1 }}>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Policy")}</th><th>{t("Status")}</th><th>{t("Version")}</th><th>{t("Accepted")}</th><th className="hide-sm">{t("Last change")}</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/policies/${row.id}`} className="person" style={{ textDecoration: "none", color: "inherit" }}>
                      <span className="kpi-ico" style={{ width: 34, height: 34, background: "var(--accentsoft)", color: "var(--accent)" }}><Icon name="book" size={16} /></span>
                      <div><b>{row.title}</b><small>{row.requiresAcknowledgement ? t("Must be accepted") : t("For information")}</small></div>
                    </Link>
                  </td>
                  <td>
                    <span className={`chip ${STATUS[row.status].cls}`}>{t(STATUS[row.status].text)}</span>
                    {row.status !== "DRAFT" && row.hasChanges && <span className="chip warn nodot" style={{ marginLeft: 6 }}>{t("Unpublished changes")}</span>}
                  </td>
                  <td className="num">{row.version ? `v${row.version}` : "—"}</td>
                  <td>{row.status === "PUBLISHED" && row.requiresAcknowledgement ? <span className="num">{row.acknowledged} / {row.required}</span> : <span className="muted">—</span>}</td>
                  <td className="muted hide-sm">{formatDayMonthYear(isoDateIn(row.updatedAt, user.timeZone))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="empty"><b className="display">{t("No policies yet")}</b><span className="muted">{t("Write your first policy — a code of conduct, leave or IT policy.")}</span></div>}
      </section>
    </div>
  );
}

import Link from "@/lib/link";
import { PageHeader } from "@/components/PageHeader";
import type { PolicyDetail } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDateTime, formatDayMonthYear, isoDateIn } from "@/lib/format";
import { PolicyActions, PolicyEditor } from "../PoliciesClient";


/** One policy: edit the draft, publish / archive, versions, and who has accepted the current version. */
export default function PolicyPage() {
  const { user, t, params } = usePage();
  const { id } = params;
  const policy = useData<PolicyDetail>(`/api/v1/policies/${encodeURIComponent(id)}`);
  if (!policy) return <PageLoading />;
  const accepted = policy.people.filter((x) => x.acknowledgedAt).length;

  return (
    <div className="col">
      <PageHeader back="/policies" eyebrow={<><Link href="/policies" className="linkish">{t("Company policies")}</Link> / {policy.version ? t("version {n}", { n: policy.version }) : t("draft")}</>} title={policy.title}
        sub={policy.status === "PUBLISHED" ? (policy.hasChanges ? t("Published — the draft below has changes that aren't published yet.") : t("Published. Edit the draft and publish again to make a new version."))
          : policy.status === "ARCHIVED" ? t("Archived — employees no longer see it. Publish it again to bring it back.") : t("Draft — nobody sees it until you publish it.")}>
        <PolicyActions policy={policy} />
      </PageHeader>

      <PolicyEditor policy={policy} />

      {policy.version > 0 && policy.status === "PUBLISHED" && policy.requiresAcknowledgement && (
        <section className="card enter" style={{ ["--i" as string]: 3 }}>
          <div className="card-h" style={{ padding: "16px 18px 0" }}>
            <h3>{t("Version {v}: {a} of {n} accepted", { v: policy.version, a: accepted, n: policy.people.length })}</h3>
          </div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>{t("Employee")}</th><th className="hide-sm">{t("Department")}</th><th>{t("Accepted")}</th></tr></thead>
              <tbody>
                {policy.people.map((person) => (
                  <tr key={person.code}>
                    <td><b>{person.name}</b> <span className="muted mono" style={{ fontSize: 12 }}>{person.code}</span></td>
                    <td className="muted hide-sm">{person.department ?? "—"}</td>
                    <td>{person.acknowledgedAt ? <span className="chip ok">{formatDateTime(new Date(person.acknowledgedAt), user.timeZone)}</span>
                      : <span className="chip warn">{t("Not yet")}{person.lastVersion ? ` ${t("(accepted v{v})", { v: person.lastVersion })}` : ""}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {policy.versions.length > 0 && (
        <section className="card enter" style={{ ["--i" as string]: 4 }}>
          <div className="card-h" style={{ padding: "16px 18px 0" }}><h3>{t("Published versions")}</h3><small className="muted">{t("A published version can never be changed.")}</small></div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>{t("Version")}</th><th>{t("Published")}</th><th className="hide-sm">{t("By")}</th><th className="r">{t("Accepted by")}</th><th className="hide-sm">{t("Text fingerprint (SHA-256)")}</th><th></th></tr></thead>
              <tbody>
                {policy.versions.map((version) => (
                  <tr key={version.versionId}>
                    <td><b>v{version.version}</b> <span className="muted">{version.title !== policy.title ? version.title : ""}</span></td>
                    <td>{formatDayMonthYear(isoDateIn(version.publishedAt, user.timeZone))}</td>
                    <td className="muted hide-sm">{version.publishedBy ?? "—"}</td>
                    <td className="r num">{version.requiresAcknowledgement ? version.acknowledgements : "—"}</td>
                    <td className="mono muted hide-sm" style={{ fontSize: 11.5 }} title={version.bodySha256}>{version.bodySha256.slice(0, 16)}…</td>
                    <td className="r">{version.fileName && <a className="linkish" href={`/api/v1/policies/${policy.id}/versions/${version.version}/file`} target="_blank" rel="noopener">{t("PDF")}</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

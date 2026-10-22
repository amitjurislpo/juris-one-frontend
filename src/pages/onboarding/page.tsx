import Link from "@/lib/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear } from "@/lib/format";
import { DefaultDocumentsButton, StartOnboardingButton } from "./OnboardingClient";
import { ONBOARDING_STATUS } from "./status";


interface Row {
  id: string; candidateName: string; personalEmail: string; designation: string | null; department: string | null; joiningDate: string | null;
  status: keyof typeof ONBOARDING_STATUS; updatedAt: string; documents: number; verified: number; employeeCode: string | null;
}

/** HR: candidates being onboarded by link, open ones first. */
export default function OnboardingPage() {
  const { t } = usePage();
  const rows = useData<Row[]>("/api/onboardings");
  if (!rows) return <PageLoading />;

  return (
    <div className="col">
      <PageHeader eyebrow={t("People ops")} title={<>{t("On")}<em>{t("boarding")}</em></>}
        sub={t("Send a new hire a link on their personal email. They fill in their details and upload documents; you verify them and add the employee.")}>
        <DefaultDocumentsButton />
        <StartOnboardingButton />
      </PageHeader>
      <section className="card enter" style={{ ["--i" as string]: 1 }}>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Candidate")}</th><th className="hide-sm">{t("Job")}</th><th>{t("Joining")}</th><th>{t("Documents")}</th><th>{t("Status")}</th><th className="hide-sm">{t("Last change")}</th></tr></thead>
            <tbody>
              {rows.map((onboarding) => (
                <tr key={onboarding.id}>
                  <td>
                    <Link href={`/onboarding/${onboarding.id}`} className="person" style={{ textDecoration: "none", color: "inherit" }}>
                      <span className="kpi-ico" style={{ width: 34, height: 34, background: "var(--accentsoft)", color: "var(--accent)" }}><Icon name="user" size={16} /></span>
                      <div><b>{onboarding.candidateName}</b><small>{onboarding.personalEmail}</small></div>
                    </Link>
                  </td>
                  <td className="hide-sm">{onboarding.designation ?? "—"}<br /><small className="muted">{onboarding.department ?? ""}</small></td>
                  <td>{onboarding.joiningDate ? formatDayMonthYear(onboarding.joiningDate) : <span className="muted">—</span>}</td>
                  <td className="num">{t("{verified}/{total} verified", { verified: onboarding.verified, total: onboarding.documents })}</td>
                  <td><span className={`chip ${ONBOARDING_STATUS[onboarding.status].className}`}>{t(ONBOARDING_STATUS[onboarding.status].text)}</span>{onboarding.employeeCode && <small className="muted mono"> {onboarding.employeeCode}</small>}</td>
                  <td className="muted hide-sm">{formatDayMonthYear(onboarding.updatedAt.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="empty"><b className="display">{t("No onboardings yet")}</b><span className="muted">{t("Start one with “New onboarding”.")}</span></div>}
      </section>
    </div>
  );
}

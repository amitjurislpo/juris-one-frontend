import { ClearFilters } from "@/components/table/Table";
import { formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { OnboardingStatusChip } from "@/pages/employees/OnboardingStatusChip";
import { hireActionLabel, type HireRow } from "./hireStatus";

const hirePath = (employeeId: string) => `/onboarding/hires/${encodeURIComponent(employeeId)}`;

/** The onboardings HR started or is reviewing. */
export function HiresTable({ rows }: { rows: HireRow[] }) {
  const t = useT();
  return (
    <>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>{t("Name")}</th><th>{t("Emp ID")}</th><th>{t("Email")}</th><th>{t("Designation")}</th><th>{t("Department")}</th><th>{t("Status")}</th><th>{t("Submitted on")}</th><th>{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((hire, i) => (
              <tr key={hire.employeeId} style={{ animationDelay: `${i * 30}ms` }}>
                <td><b><Link href={hirePath(hire.employeeId)} style={{ color: "inherit", fontWeight: 600 }}>{hire.name}</Link></b></td>
                <td className="num">{hire.employeeCode}</td>
                <td className="muted">{hire.email}</td>
                <td>{hire.designation ?? "-"}</td>
                <td>{hire.department ?? "-"}</td>
                <td><OnboardingStatusChip status={hire.status} /></td>
                <td>{hire.submittedAt ? formatDayMonthYear(hire.submittedAt.slice(0, 10)) : "-"}</td>
                <td><Link className="btn btn-sm" href={hirePath(hire.employeeId)}>{t(hireActionLabel(hire.status))}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="empty"><b>{t("No onboardings yet")}</b><span className="muted">{t("Use Onboard employee to invite a new hire, or change the filter.")}</span><ClearFilters /></div>}
    </>
  );
}

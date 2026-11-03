import { useData } from "@/lib/page";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { formatDayMonthYear } from "@/lib/format";
import { normalizeHires } from "@/pages/onboarding/hr/hireStatus";

/** Onboarding forms that employees (or HR for them) have submitted and that wait for HR's review; nothing is shown when there are none. */
export function SubmittedForms() {
  const t = useT();
  const { rows, total } = normalizeHires(useData<unknown>("/api/v1/onboardings?status=SUBMITTED"));
  if (!rows.length) return null;
  return (
    <section className="card enter" aria-label={t("Submitted forms")}>
      <div style={{ padding: "14px 18px" }}>
        <b>{t("Submitted forms awaiting review")}</b> <span className="chip info nodot">{total}</span>
        <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {rows.map((hire) => (
            <li key={hire.employeeId} className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <span><b>{hire.name}</b> <span className="muted">{hire.employeeCode}{hire.submittedAt ? ` · ${t("Submitted")} ${formatDayMonthYear(hire.submittedAt)}` : ""}</span></span>
              <Link className="btn" href={`/onboarding/hires/${encodeURIComponent(hire.employeeId)}`}>{t("Review")}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

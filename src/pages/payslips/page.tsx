import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear, formatMonthLabel } from "@/lib/format";
import type { PayslipSnapshot } from "@/lib/api-types";
import { SlipActions } from "./SlipViewer";


/** A month appears only after Finance closes it; open months show "Processing" (REQUIREMENTS §5.11). */
export default function PayslipsPage() {
  const { user, t } = usePage();
  const data = useData<{ india: boolean; months: ({ month: string; closed: false } | { month: string; closed: true; snapshot: PayslipSnapshot; paidOn: string | null })[] }>("/api/payslips");
  if (!data) return <PageLoading />;
  const { india, months } = data;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Payslips")} title={t("My")} em={t("payslips")} sub={t("A month's payslip appears here once Finance closes that month's payroll.")} />
      <div className="slip-grid">
        {months.map((m, i) => (
          <div key={m.month} className={`card slip-card enter${m.closed ? "" : " locked"}`} style={{ ["--i" as string]: i }}>
            <span className="spot"></span>
            <span className="slip-ico"><Icon n={m.closed ? "doc" : "clock"} s={20} /></span>
            <span style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left", flex: 1, minWidth: 0 }}>
              <b className="display" style={{ fontSize: 24 }}>{formatMonthLabel(m.month)}</b>
              <span className="faint" style={{ fontSize: 12.5 }}>{m.closed ? t("Paid on {date} · {n} paid days", { date: m.paidOn ? formatDayMonthYear(m.paidOn) : "—", n: m.snapshot.attendance.paidDays }) : t("Payroll in progress — available once Finance closes it")}</span>
            </span>
            {m.closed ? <SlipActions snap={m.snapshot} code={user.code} /> : <span className="chip warn">{t("Processing")}</span>}
          </div>
        ))}
      </div>
      {!months.length && (
        <div className="empty">
          <b className="display">{t("No payslips yet")}</b>
          <span className="muted">{india ? t("Your first payslip will appear after your first payroll is closed.") : t("Payslips here are for the India payroll. US team pay statements come from the US payroll provider.")}</span>
        </div>
      )}
    </div>
  );
}

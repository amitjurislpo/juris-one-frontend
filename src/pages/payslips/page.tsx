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
      <PageHeader eyebrow={t("Payslips")} title={t("My")} emphasis={t("payslips")} sub={t("A month's payslip appears here once Finance closes that month's payroll.")} />
      <div className="slip-grid">
        {months.map((month, i) => (
          <div key={month.month} className={`card slip-card enter${month.closed ? "" : " locked"}`} style={{ ["--i" as string]: i }}>
            <span className="spot"></span>
            <span className="slip-ico"><Icon name={month.closed ? "doc" : "clock"} size={20} /></span>
            <span style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left", flex: 1, minWidth: 0 }}>
              <b className="display" style={{ fontSize: 24 }}>{formatMonthLabel(month.month)}</b>
              <span className="faint" style={{ fontSize: 12.5 }}>{month.closed ? t("Paid on {date} · {n} paid days", { date: month.paidOn ? formatDayMonthYear(month.paidOn) : "—", n: month.snapshot.attendance.paidDays }) : t("Payroll in progress — available once Finance closes it")}</span>
            </span>
            {month.closed ? <SlipActions snap={month.snapshot} code={user.code} /> : <span className="chip warn">{t("Processing")}</span>}
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

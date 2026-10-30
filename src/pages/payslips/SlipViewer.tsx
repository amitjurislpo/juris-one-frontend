
import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { formatDayMonthYear, formatRupees, formatMonthLabel } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { PayslipSnapshot } from "@/lib/api-types";

export function SlipActions({ snap, code }: { snap: PayslipSnapshot; code: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const href = `/api/v1/payslips/${snap.month}/${code}`;
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}><Icon name="eye" size={14} />{t("View")}</button>
      <a className="btn btn-sm btn-gold" href={href} download><Icon name="download" size={14} />PDF</a>
      {open && <SlipView snap={snap} href={href} onClose={() => setOpen(false)} />}
    </>
  );
}

/** In-browser payslip (prototype tpl-slip) rendered from the frozen snapshot. */
function SlipView({ snap: snapshot, href, onClose }: { snap: PayslipSnapshot; href: string; onClose: () => void }) {
  const t = useT();
  const e = snapshot.employee;
  return createPortal(
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()} onKeyDown={(event) => event.key === "Escape" && onClose()}>
      <div className="slip-wrap" role="dialog" aria-modal="true" aria-label={t("Payslip {month}", { month: formatMonthLabel(snapshot.month) })}>
        <div className="slip-bar">
          <b>Payslip-{e.code}-{snapshot.month}.pdf</b><span style={{ flex: 1 }}></span>
          <a className="btn btn-sm" href={href} download><Icon name="download" size={14} />{t("Download PDF")}</a>
          <button className="icon-btn" onClick={onClose} aria-label={t("Close")} autoFocus><Icon name="x" size={16} /></button>
        </div>
        <article className="slip">
          <header className="slip-h">
            
            <img src="/brand/logo-ink.png" alt={snapshot.company.name} style={{ width: 170, height: "auto" }} />
            <div style={{ textAlign: "right" }}><div className="slip-title">{t("PAYSLIP")}</div><div className="muted">{formatMonthLabel(snapshot.month)}</div><div className="faint" style={{ fontSize: 11.5 }}>{snapshot.company.name} · {snapshot.company.address}</div></div>
          </header>
          <div className="slip-meta">
            <div><small>{t("Employee")}</small><b>{e.name}</b></div><div><small>{t("Employee ID")}</small><b>{e.code}</b></div><div><small>{t("Designation")}</small><b>{e.designation}</b></div>
            <div><small>{t("Department")}</small><b>{e.department}</b></div><div><small>{t("Date of joining")}</small><b>{formatDayMonthYear(e.dateOfJoining)}</b></div><div><small>{t("Tax regime")}</small><b>{snapshot.regime === "OLD" ? t("Old regime") : t("New regime")}</b></div>
            <div><small>PAN</small><b>{e.panLast4 ? `XXXXXX${e.panLast4}` : "—"}</b></div><div><small>{t("Bank account")}</small><b>{e.bankLast4 ? `${e.bankName ?? t("Bank")} XXXX${e.bankLast4}` : "—"}</b></div><div><small>{t("Pay date")}</small><b>{formatDayMonthYear(snapshot.payDate)}</b></div>
          </div>
          <div className="slip-att">
            <div><small>{t("Days in month")}</small><b>{snapshot.attendance.daysInMonth}</b></div><div><small>{t("Weekly offs")}</small><b>{snapshot.attendance.weeklyOffs}</b></div><div><small>{t("Holidays")}</small><b>{snapshot.attendance.holidays}</b></div>
            <div><small>{t("Present")}</small><b>{snapshot.attendance.present}</b></div><div><small>{t("Loss of pay")}</small><b style={{ color: snapshot.attendance.lopDays ? "var(--bad)" : undefined }}>{snapshot.attendance.lopDays}</b></div><div><small>{t("Paid days")}</small><b>{snapshot.attendance.paidDays}</b></div>
          </div>
          <div className="slip-tables">
            <table>
              <thead><tr><th>{t("Earnings")}</th><th className="r">{t("Rate")}</th><th className="r">{t("Earned")}</th></tr></thead>
              <tbody>{snapshot.components.map((earning) => <tr key={earning.label}><td>{t(earning.label)}</td><td className="r num faint">{earning.rate ? formatRupees(earning.rate) : "—"}</td><td className="r num">{formatRupees(earning.earned)}</td></tr>)}</tbody>
              <tfoot><tr><td>{t("Gross earnings")}</td><td></td><td className="r num">{formatRupees(snapshot.grossEarned)}</td></tr></tfoot>
            </table>
            <table>
              <thead><tr><th>{t("Deductions")}</th><th className="r">{t("Amount")}</th></tr></thead>
              <tbody>{snapshot.deductions.map((deduction) => <tr key={deduction.label}><td>{t(deduction.label)}</td><td className="r num">{formatRupees(deduction.amount)}</td></tr>)}</tbody>
              <tfoot><tr><td>{t("Total deductions")}</td><td className="r num">{formatRupees(snapshot.totalDeductions)}</td></tr></tfoot>
            </table>
          </div>
          <div className="slip-net"><div><small>{t("Net pay")}</small><div style={{ fontSize: 13, opacity: 0.85 }}>{t("Rupees {words} only", { words: snapshot.netWords })}</div></div><b className="display">{formatRupees(snapshot.net)}</b></div>
          <p className="faint" style={{ fontSize: 11.5, lineHeight: 1.6, margin: "16px 0 0" }}>
            {t("Earned = monthly rate × paid days ÷ days in month. PF is 12% of earned Basic (wage ceiling ₹15,000).")} {snapshot.regime === "OLD" ? t("TDS is based on the old regime with verified investment proofs.") : t("TDS is based on the new regime.")}{snapshot.note ? ` ${t("Note: {note}.", { note: snapshot.note })}` : ""} {t("This is a system-generated payslip and does not require a signature.")}
          </p>
        </article>
      </div>
    </div>,
    document.body,
  );
}

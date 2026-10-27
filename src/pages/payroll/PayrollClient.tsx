
import { useState, useSyncExternalStore, useTransition } from "react";
import { useDismissOnEdit } from "@/lib/useDismissOnEdit";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { SortableHeader } from "@/components/table/Table";
import { useQuery } from "@/components/table/useQuery";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { formatRupees, formatMonthLabel } from "@/lib/format";
import type { PayView } from "@/lib/api-types";
import { approveAndClose, resetAdjustment, saveAdjustment } from "./actions";
import { Avatar } from "@/components/Avatar";

// "Hide amounts" is a per-viewer preference kept in localStorage (shared across payroll pages).
const KEY = "jo_hide_amounts";
const listeners = new Set<() => void>();
const readHidden = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
function useHidden(): [boolean, (isHidden: boolean) => void] {
  const hidden = useSyncExternalStore((onStoreChange) => { listeners.add(onStoreChange); return () => listeners.delete(onStoreChange); }, readHidden, () => false);
  return [hidden, (shouldHide) => { try { localStorage.setItem(KEY, shouldHide ? "1" : "0"); } catch { /* no storage: the choice is not remembered */ } listeners.forEach((listener) => listener()); }];
}
const MASK = "₹ ••,•••";

export function MonthSeg({ months, value }: { months: string[]; value: string }) {
  const { set } = useQuery();
  const t = useT();
  return (
    <div className="seg" role="group" aria-label={t("Payroll month")}>
      {months.map((monthOption) => <button key={monthOption} type="button" className={value === monthOption ? "on" : undefined} aria-pressed={value === monthOption} onClick={() => set({ month: monthOption })}>{formatMonthLabel(monthOption).slice(0, 3)} {monthOption.slice(2, 4)}</button>)}
    </div>
  );
}

export function PayrollKpis({ totals }: { totals: { employeeCount: number; earned: number; lop: number; tds: number; net: number } }) {
  const t = useT();
  const [hidden, setHidden] = useHidden();
  const maskSummaryRupees = (v: number) => (hidden ? MASK : formatRupees(v));
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
        <button className="btn btn-sm" onClick={() => setHidden(!hidden)}><Icon name={hidden ? "eye" : "eyeoff"} size={14} />{hidden ? t("Show amounts") : t("Hide amounts")}</button>
      </div>
      <div className="kpis">
        <div className="card kpi enter" style={{ ["--i" as string]: 3 }}><span className="spot"></span><span className="l">{t("Employees")}</span><span className="v num">{totals.employeeCount}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 4 }}><span className="spot"></span><span className="l">{t("Gross earned")}</span><span className="v num">{maskSummaryRupees(totals.earned)}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 5 }}><span className="spot"></span><span className="l" style={{ color: "var(--bad)" }}>{t("Loss-of-pay days")}</span><span className="v num">{totals.lop}</span></div>
        <div className="card kpi enter" style={{ ["--i" as string]: 6 }}><span className="spot"></span><span className="l">{t("TDS to deposit")}</span><span className="v num">{maskSummaryRupees(totals.tds)}</span></div>
        <div className="card kpi enter kpi-accent" style={{ ["--i" as string]: 7 }}><span className="spot"></span><span className="l">{t("Net payout")}</span><span className="v num">{maskSummaryRupees(totals.net)}</span></div>
      </div>
    </>
  );
}

export function CloseButton({ month, closed, locked, count }: { month: string; closed: boolean; locked: boolean; count: number }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  const { set } = useQuery();
  if (closed) return <button className="btn btn-gold" disabled>{t("Closed ✓")}</button>;
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-gold" disabled={!locked || busy} title={locked ? undefined : t("Attendance isn't locked yet")} onClick={() => setAsk(true)}>{busy ? t("Closing…") : t("Approve & close")}</button>
      {ask && (
        <ConfirmDialog title={t("Close {month} payroll", { month: formatMonthLabel(month) })} confirm={t("Approve & close")} busy={busy} onClose={() => setAsk(false)}
          body={<>{count === 1 ? t("This publishes 1 payslip and freezes it. Later changes to salary, regime or attendance won't change it — corrections go into the next month as arrears.") : t("This publishes {count} payslips and freezes them. Later changes to salary, regime or attendance won't change them — corrections go into the next month as arrears.", { count })}</>}
          onConfirm={() => start(async () => { const approveResult = await approveAndClose(month); toast(approveResult.ok ? approveResult.message! : approveResult.error, approveResult.ok ? "ok" : "bad"); setAsk(false); if (approveResult.ok) set({ month }) /* stay on the month just closed */; })} />
      )}
    </>
  );
}

export function PayrollTable({ rows, month, closed }: { rows: PayView[]; month: string; closed: boolean }) {
  const t = useT();
  const readOnly = useReadOnly();
  const [hidden] = useHidden();
  const [editing, setEditing] = useState<PayView | null>(null);
  const maskRowRupees = (v: number) => (hidden ? "••••" : formatRupees(v));
  return (
    <>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <SortableHeader sortKey="name" dflt="name">{t("Employee")}</SortableHeader>
              <SortableHeader sortKey="gross" dflt="name" right>{t("Monthly gross")}</SortableHeader>
              <SortableHeader sortKey="lop" dflt="name" right>{t("LOP")}</SortableHeader>
              <SortableHeader sortKey="paid" dflt="name" right>{t("Paid days")}</SortableHeader>
              <th className="r">{t("Bonus")}</th>
              <SortableHeader sortKey="earned" dflt="name" right>{t("Earned")}</SortableHeader>
              <th className="r">{t("PF + PT")}</th>
              <SortableHeader sortKey="tds" dflt="name" right>{t("TDS")}</SortableHeader>
              <SortableHeader sortKey="net" dflt="name" right>{t("Net pay")}</SortableHeader>
              <th><span className="sr-only">{t("Actions")}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((payrollRow, i) => (
              <tr key={payrollRow.employeeId} style={{ animationDelay: `${i * 35}ms` }}>
                <td><div className="person"><Avatar id={payrollRow.employeeId} name={payrollRow.name} photo={payrollRow.photo} /><div><b>{payrollRow.name}</b><small>{payrollRow.code} · {payrollRow.regime === "OLD" ? t("Old regime") : t("New regime")}{payrollRow.edited ? ` · ${t("edited")}` : ""}</small></div></div></td>
                <td className="r num muted">{maskRowRupees(payrollRow.monthlyGross)}</td>
                <td className="r num" style={{ color: payrollRow.lop ? "var(--bad)" : "var(--faint)" }}>{payrollRow.lop}</td>
                <td className="r num">{payrollRow.paid}/{payrollRow.days}</td>
                <td className="r num muted">{payrollRow.bonus ? maskRowRupees(payrollRow.bonus) : "—"}</td>
                <td className="r num">{maskRowRupees(payrollRow.earned)}</td>
                <td className="r num muted">{maskRowRupees(payrollRow.pfPt)}</td>
                <td className="r num muted">{maskRowRupees(payrollRow.tds)}</td>
                <td className="r num" style={{ color: "var(--accenttext)", fontWeight: 600 }}>{maskRowRupees(payrollRow.net)}</td>
                <td className="r">{closed ? <span className="faint" style={{ fontSize: 12 }}>{t("Locked")}</span> : readOnly ? null : <button className="btn btn-sm btn-ghost" onClick={() => setEditing(payrollRow)} aria-label={t("Edit payroll for {name}", { name: payrollRow.name })}><Icon name="edit" size={14} />{t("Edit")}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="empty"><b>{t("No one here")}</b><span className="muted">{t("Nobody matches, or no one has a salary structure for this month yet.")}</span></div>}
      {editing && <EditPay row={editing} month={month} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditPay({ row, month, onClose }: { row: PayView; month: string; onClose: () => void }) {
  const toast = useToast();
  const t = useT();
  const [busy, start] = useTransition();
  const [adjustmentForm, setF] = useState({ lop: String(row.lop), bonus: String(row.bonus / 100), other: String(row.other / 100), note: row.note ?? "" });
  const [err, setErr] = useState("");
  useDismissOnEdit(err, () => setErr(""), adjustmentForm);
  const save = () => start(async () => {
    const lop = Number(adjustmentForm.lop);
    const saveResult = await saveAdjustment({ month, employeeId: row.employeeId, lopDays: lop === row.attendanceLop && !row.edited ? null : lop, bonus: Math.round(Number(adjustmentForm.bonus) || 0), otherDeduction: Math.round(Number(adjustmentForm.other) || 0), note: adjustmentForm.note });
    if (saveResult.ok) { toast(saveResult.message!); onClose(); } else setErr(saveResult.error);
  });
  return (
    <Modal title={t("Edit payroll · {name}", { name: row.name })} eyebrow={`${row.code} · ${formatMonthLabel(month)}`} size="sm" onClose={onClose}
      footer={<>
        {row.edited ? <button className="btn btn-ghost" disabled={busy} onClick={() => start(async () => { const resetResult = await resetAdjustment(month, row.employeeId); toast(resetResult.ok ? resetResult.message! : resetResult.error); onClose(); })}>{t("Reset to attendance")}</button> : <span></span>}
        <div className="row" style={{ gap: 10 }}><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{t("Save changes")}</button></div>
      </>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid3">
          <label className="field">{t("LOP days")}<input type="number" min={0} step={0.5} max={row.days} value={adjustmentForm.lop} onChange={(e) => setF({ ...adjustmentForm, lop: e.target.value })} /><span className="hint">{t("attendance: {n}", { n: row.attendanceLop })}</span></label>
          <label className="field">{t("Bonus / arrears (₹)")}<input type="number" min={0} step={1} value={adjustmentForm.bonus} onChange={(e) => setF({ ...adjustmentForm, bonus: e.target.value })} /></label>
          <label className="field">{t("Other deduction (₹)")}<input type="number" min={0} step={1} value={adjustmentForm.other} onChange={(e) => setF({ ...adjustmentForm, other: e.target.value })} /></label>
        </div>
        <label className="field">{t("Note")} <span className="hint">{t("shown on the payroll register and payslip")}</span><input value={adjustmentForm.note} maxLength={200} onChange={(e) => setF({ ...adjustmentForm, note: e.target.value })} placeholder={t("e.g. Diwali bonus, laptop recovery")} /></label>
        <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>{t("Monthly rates come from the salary structure ({gross} gross). To change them permanently, revise the structure.", { gross: formatRupees(row.monthlyGross) })}</p>
        {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
      </div>
    </Modal>
  );
}

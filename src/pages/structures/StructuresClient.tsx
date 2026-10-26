
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { Drawer, Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { formatDayMonthYear, formatRupees } from "@/lib/format";
import { splitGross } from "@/lib/payroll/engine";
import { addStructure } from "./actions";

export interface SalaryRevision { from: string; basic: number; hra: number; lta: number; special: number; reason: string }
const REASONS = [["JOINING", "Joining"], ["APPRAISAL", "Appraisal"], ["PROMOTION", "Promotion"], ["CORRECTION", "Correction"]] as const;
const REASON_LABEL: Record<string, string> = Object.fromEntries(REASONS);

export function StructureButton({ emp, current, minFrom }: { emp: { id: string; code: string; name: string; title: string; dateOfJoining: string }; current: SalaryRevision | null; minFrom: string }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const toRupeeText = (p: number) => String(Math.round(p / 100));
  const init = () => ({
    from: current ? "" : minFrom, reason: current ? "APPRAISAL" : "JOINING",
    target: current ? toRupeeText(current.basic + current.hra + current.lta + current.special) : "",
    basic: current ? toRupeeText(current.basic) : "", hra: current ? toRupeeText(current.hra) : "", lta: current ? toRupeeText(current.lta) : "", special: current ? toRupeeText(current.special) : "",
  });
  const [salaryForm, setSalaryForm] = useState(init);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const parseRupees = (s: string) => Math.max(0, Math.round(Number(s) || 0));
  const monthlyGross = parseRupees(salaryForm.basic) + parseRupees(salaryForm.hra) + parseRupees(salaryForm.lta) + parseRupees(salaryForm.special);
  const pf = Math.round(0.12 * Math.min(parseRupees(salaryForm.basic), 15000));
  const split = () => { const salarySplit = splitGross(parseRupees(salaryForm.target) * 100); setSalaryForm({ ...salaryForm, basic: toRupeeText(salarySplit.basic), hra: toRupeeText(salarySplit.hra), lta: toRupeeText(salarySplit.lta), special: toRupeeText(salarySplit.special) }); };
  const save = () => start(async () => {
    setErr("");
    const res = await addStructure({ employeeId: emp.id, effectiveFrom: salaryForm.from, reason: salaryForm.reason as "JOINING" | "APPRAISAL" | "PROMOTION" | "CORRECTION", basic: parseRupees(salaryForm.basic), hra: parseRupees(salaryForm.hra), lta: parseRupees(salaryForm.lta), special: parseRupees(salaryForm.special) });
    if (res.ok) { toast(res.message!); setOpen(false); } else setErr(res.error);
  });
  if (readOnly) return null;
  return (
    <>
      <button className={`btn btn-sm${current ? "" : " btn-gold"}`} onClick={() => { setSalaryForm(init()); setErr(""); setOpen(true); }}><Icon name={current ? "edit" : "plus"} size={14} />{current ? t("Revise") : t("Set up")}</button>
      {open && (
        <Modal title={`${current ? t("Revise salary") : t("Set salary structure")} · ${emp.name}`} eyebrow={`${emp.code} · ${emp.title}`} maxWidth={640} onClose={() => setOpen(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>{t("Cancel")}</button><button className="btn btn-gold" disabled={!monthlyGross || !salaryForm.from || busy} onClick={save}>{busy ? t("Saving…") : t("Save structure")}</button></>}>
          <div className="col" style={{ gap: 16 }}>
            <div className="grid3">
              <label className="field">{t("Effective from")}<input type="date" min={minFrom} value={salaryForm.from} onChange={(e) => setSalaryForm({ ...salaryForm, from: e.target.value })} /></label>
              <label className="field">{t("Reason")}<select value={salaryForm.reason} onChange={(e) => setSalaryForm({ ...salaryForm, reason: e.target.value })}>{REASONS.map(([reasonCode, reasonLabel]) => <option key={reasonCode} value={reasonCode}>{t(reasonLabel)}</option>)}</select></label>
              <label className="field">{t("Target gross / month (₹)")}
                <span style={{ display: "flex", gap: 6 }}><input type="number" min={0} value={salaryForm.target} onChange={(e) => setSalaryForm({ ...salaryForm, target: e.target.value })} style={{ flex: 1, minWidth: 0 }} /><button type="button" className="btn btn-sm" onClick={split}>{t("Split")}</button></span>
              </label>
            </div>
            <div className="grid2">
              <label className="field">{t("Basic (₹)")}<input type="number" min={0} value={salaryForm.basic} onChange={(e) => setSalaryForm({ ...salaryForm, basic: e.target.value })} /></label>
              <label className="field">{t("House rent allowance (₹)")}<input type="number" min={0} value={salaryForm.hra} onChange={(e) => setSalaryForm({ ...salaryForm, hra: e.target.value })} /></label>
              <label className="field">{t("Leave travel allowance (₹)")}<input type="number" min={0} value={salaryForm.lta} onChange={(e) => setSalaryForm({ ...salaryForm, lta: e.target.value })} /></label>
              <label className="field">{t("Special allowance (₹)")}<input type="number" min={0} value={salaryForm.special} onChange={(e) => setSalaryForm({ ...salaryForm, special: e.target.value })} /></label>
            </div>
            <div className="summary">
              <div><small>{t("Monthly gross")}</small><b>{formatRupees(monthlyGross * 100)}</b></div>
              <div><small>{t("Employee PF")}</small><b>{formatRupees(pf * 100)}</b></div>
              <div><small>{t("Annual CTC (incl. employer PF)")}</small><b>{formatRupees((monthlyGross + pf) * 1200)}</b></div>
            </div>
            <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>{t("“Split” uses Basic 50% · HRA 20% · LTA 5% · Special for the rest. Older structures stay in history; payroll picks the one effective on the last day of each month.")}</p>
            {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function HistoryButton({ name, revs, today }: { name: string; revs: SalaryRevision[]; today: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const current = revs.find((r) => r.from <= today);
  return (
    <>
      <button className="btn btn-sm btn-ghost" style={{ marginLeft: 6 }} onClick={() => setOpen(true)}>{revs.length === 1 ? t("1 revision") : t("{n} revisions", { n: revs.length })}</button>
      {open && (
        <Drawer label={t("Revision history")} onClose={() => setOpen(false)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><span className="eyebrow">{t("Revision history")}</span><h2 className="display" style={{ margin: "4px 0 0", fontSize: 28 }}>{name}</h2></div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("Close")}><Icon name="x" size={16} /></button>
          </div>
          {revs.map((revision) => (
            <div className="card pad" key={revision.from} style={{ boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><b>{formatDayMonthYear(revision.from)}</b><span className={`chip ${revision === current ? "ok" : revision.from > today ? "info" : "neutral"}`}>{revision === current ? t("Current") : revision.from > today ? t("Upcoming") : t(REASON_LABEL[revision.reason] ?? revision.reason)}</span></div>
              <div className="kv"><span className="muted">{t("Monthly gross")}</span><b className="num">{formatRupees(revision.basic + revision.hra + revision.lta + revision.special)}</b></div>
              <div className="faint" style={{ fontSize: 12.5 }}>{t("Basic {basic} · HRA {hra} · LTA {lta} · Special {special}", { basic: formatRupees(revision.basic), hra: formatRupees(revision.hra), lta: formatRupees(revision.lta), special: formatRupees(revision.special) })}</div>
            </div>
          ))}
        </Drawer>
      )}
    </>
  );
}

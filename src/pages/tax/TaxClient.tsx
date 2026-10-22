
import { useRouter } from "@/lib/router";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { Drawer } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { formatRupees, formatMonthLabel } from "@/lib/format";
import type { TaxProjection } from "@/lib/api-types";
import { overrideRegime, setPreviousEmployer, taxDetail } from "./actions";

const formatWholeRupees = (rupees: number) => formatRupees(rupees * 100);
const pct = (r: number) => `${Math.round(r * 100)}%`;

/** A table row that opens the computation drawer. */
export function TaxRow({ id, name, animationIndex: i, children }: { id: string; name: string; animationIndex: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const translate = useT();
  return (
    <>
      <tr onClick={() => setOpen(true)} style={{ cursor: "pointer", animationDelay: `${i * 35}ms` }} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(true)} aria-label={translate("Tax computation for {name}", { name })}>{children}</tr>
      {open && <TaxDrawer id={id} onClose={() => setOpen(false)} />}
    </>
  );
}

function TaxDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const translate = useT();
  const readOnly = useReadOnly();
  const [detail, setDetail] = useState<{ month: string; tax: TaxProjection; name: string; code: string; title: string } | null>(null);
  const [prev, setPrev] = useState({ income: "", tds: "" });
  const [busy, start] = useTransition();
  const load = useCallback(() => taxDetail(id).then((response) => {
    if (response.ok) { setDetail(response.data!); setPrev({ income: String(response.data!.tax.prevIncome), tds: String(response.data!.tax.prevTds) }); }
    else toast(response.error, "bad");
  }), [id, toast]);
  useEffect(() => { void load(); }, [load]);

  const act = (pendingAction: Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    const actionResult = await pendingAction;
    toast(actionResult.ok ? actionResult.message! : actionResult.error!, actionResult.ok ? "ok" : "bad");
    await load();
    router.refresh();
  });

  const t = detail?.tax;
  const cur = t?.current;
  const max = t ? Math.max(t.newRegime.total, t.oldRegime.total, 1) : 1;
  return (
    <Drawer label={translate("Tax computation")} width={560} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><span className="eyebrow">{detail ? `${detail.code} · ${detail.title}` : translate("Loading…")}</span><h2 className="display" style={{ margin: "4px 0 0", fontSize: 30 }}>{detail?.name ?? ""}</h2></div>
        <button className="icon-btn" onClick={onClose} aria-label={translate("Close")}><Icon name="x" size={16} /></button>
      </div>
      {t && cur && detail && (
        <>
          <div className="field">{translate("Tax regime")} <span className="hint">{t.regimeOverridden ? translate("Employee's choice — currently set by Finance; Finance can override") : translate("Employee's choice; Finance can override")}</span>
            <div className="seg" style={{ width: "100%" }} role="group" aria-label={translate("Tax regime")}>
              {(["NEW", "OLD"] as const).map((regime) => <button key={regime} type="button" className={t.regime === regime ? "on" : undefined} aria-pressed={t.regime === regime} disabled={busy || readOnly} onClick={() => t.regime !== regime && act(overrideRegime(id, regime))}>{regime === "NEW" ? translate("New regime") : translate("Old regime")}</button>)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="display" style={{ fontSize: 44, lineHeight: 1 }}>{formatWholeRupees(t.monthly)}</span>
            <span className="muted">{translate(t.monthsLeft === 1 ? "TDS / month · {n} month left · {month}" : "TDS / month · {n} months left · {month}", { n: t.monthsLeft, month: formatMonthLabel(detail.month) })}</span>
          </div>
          {(["NEW", "OLD"] as const).map((regimeOption) => {
            const regimeTax = regimeOption === "NEW" ? t.newRegime : t.oldRegime;
            return (
              <div className="cmp" key={regimeOption}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span className="muted">{regimeOption === "NEW" ? translate("New regime · annual tax") : translate("Old regime · annual tax (verified proofs)")}</span><b className="num">{formatWholeRupees(regimeTax.total)}</b></div>
                <div className="track"><i style={{ width: `${(regimeTax.total / max) * 100}%`, background: t.regime === regimeOption ? "var(--accentgrad)" : "var(--line3)" }}></i></div>
              </div>
            );
          })}
          <div>
            <div className="kv"><span className="muted">{translate("Salary from Juris · {label}", { label: t.jurisLabel })}</span><b className="num">{formatWholeRupees(t.jurisIncome)}</b></div>
            {t.prevIncome > 0 && <div className="kv"><span className="muted">{translate("Previous employer (Form 12B)")}</span><b className="num">{formatWholeRupees(t.prevIncome)}</b></div>}
            <div className="kv"><span className="muted">{translate("Standard deduction")}</span><b className="num">− {formatWholeRupees(cur.standardDeduction)}</b></div>
            {t.regime === "OLD" && t.deductions.lines.map(([deductionLabel, deductionAmount]) => <div className="kv" key={deductionLabel}><span className="muted">{deductionLabel}</span><b className="num">− {formatWholeRupees(deductionAmount)}</b></div>)}
            <div className="kv"><span className="muted">{translate("Taxable income")}</span><b className="num">{formatWholeRupees(cur.taxable)}</b></div>
            <div className="kv"><span className="muted">{translate("Tax on slabs")}</span><b className="num">{formatWholeRupees(Math.round(cur.slabTax))}</b></div>
            {cur.rebate > 0 && <div className="kv"><span className="muted">{cur.base === 0 ? translate("Rebate (87A)") : translate("Marginal relief")}</span><b className="num">− {formatWholeRupees(Math.round(cur.rebate))}</b></div>}
            {cur.surcharge > 0 && <div className="kv"><span className="muted">{translate("Surcharge")}</span><b className="num">{formatWholeRupees(Math.round(cur.surcharge))}</b></div>}
            <div className="kv"><span className="muted">{translate("Health & education cess 4%")}</span><b className="num">{formatWholeRupees(Math.round(cur.cess))}</b></div>
            <div className="kv total"><span>{translate("Annual tax")}</span><b className="num">{formatWholeRupees(cur.total)}</b></div>
            {(t.prevTds > 0 || t.jurisTdsSoFar > 0) && <div className="kv"><span className="muted">{translate("TDS already deducted (previous employer {prev} · Juris {juris})", { prev: formatWholeRupees(t.prevTds), juris: formatWholeRupees(t.jurisTdsSoFar) })}</span><b className="num">− {formatWholeRupees(t.prevTds + t.jurisTdsSoFar)}</b></div>}
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>{translate("Slab working")}</div>
            {cur.lines.map((slab) => <div className="kv" key={slab.from}><span className="muted">{formatWholeRupees(slab.from)} – {slab.to === null ? translate("above") : formatWholeRupees(slab.to)} · {pct(slab.rate)}</span><b className="num">{formatWholeRupees(Math.round(slab.amount))}</b></div>)}
          </div>
          <div className="card pad" style={{ boxShadow: "none" }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{translate("Previous employer this FY (Form 12B)")}</div>
            <div className="grid2">
              <label className="field">{translate("Income (₹)")}<input type="number" min={0} value={prev.income} disabled={readOnly} onChange={(e) => setPrev({ ...prev, income: e.target.value })} /></label>
              <label className="field">{translate("TDS deducted (₹)")}<input type="number" min={0} value={prev.tds} disabled={readOnly} onChange={(e) => setPrev({ ...prev, tds: e.target.value })} /></label>
            </div>
            {!readOnly && <button className="btn btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={() => act(setPreviousEmployer({ employeeId: id, income: Math.round(Number(prev.income) || 0), tds: Math.round(Number(prev.tds) || 0) }))}>{translate("Save")}</button>}
          </div>
        </>
      )}
    </Drawer>
  );
}

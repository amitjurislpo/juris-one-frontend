
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import type { PlanRow } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { MODULE_LABELS } from "@/lib/subscription";
import { createPlan, updatePlan, type PlanInput } from "../platform/actions";

interface Form { name: string; description: string; price: string; periodMonths: string; maxEmployees: string; modules: string[]; active: boolean }

const toForm = (planRow?: PlanRow): Form => planRow
  ? { name: planRow.name, description: planRow.description ?? "", price: String(planRow.pricePaise / 100), periodMonths: String(planRow.periodMonths), maxEmployees: planRow.maxEmployees ? String(planRow.maxEmployees) : "", modules: planRow.modules, active: planRow.active }
  : { name: "", description: "", price: "", periodMonths: "12", maxEmployees: "", modules: [], active: true };

/** "New plan" (no plan) or the edit button on a plan row. */
export function PlanButton({ plan }: { plan?: PlanRow }) {
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [planForm, setF] = useState<Form>(toForm(plan));
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const set = (x: Partial<Form>) => { setF({ ...planForm, ...x }); setErr(""); };
  const close = () => { setOpen(false); setErr(""); };
  const save = () => {
    if (!planForm.name.trim()) return setErr(t("Enter the plan name."));
    if (planForm.price === "" || Number.isNaN(Number(planForm.price))) return setErr(t("Enter a price in rupees (0 or more)."));
    const body: PlanInput = {
      name: planForm.name, description: planForm.description, price: Number(planForm.price), periodMonths: Number(planForm.periodMonths),
      maxEmployees: planForm.maxEmployees === "" ? null : Number(planForm.maxEmployees), modules: planForm.modules, active: planForm.active,
    };
    start(async () => {
      const saveResult = plan ? await updatePlan(plan.id, body) : await createPlan(body);
      if (saveResult.ok) { toast(saveResult.message!); close(); } else setErr(saveResult.error);
    });
  };
  return (
    <>
      {plan
        ? <button className="btn btn-sm btn-ghost" onClick={() => { setF(toForm(plan)); setOpen(true); }} aria-label={t("Edit {name}", { name: plan.name })}><Icon name="edit" size={14} /></button>
        : <button className="btn btn-gold btn-lg" onClick={() => { setF(toForm()); setOpen(true); }}><Icon name="plus" size={16} />{t("New plan")}</button>}
      {open && (
        <Modal title={plan ? t("Edit plan") : t("New plan")} eyebrow={t("Platform")} size="sm" onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : plan ? t("Save plan") : t("Create plan")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <label className="field">{t("Plan name *")}<input value={planForm.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} autoFocus /></label>
            <label className="field">{t("Description")} <span className="hint">{t("optional")}</span><input value={planForm.description} onChange={(e) => set({ description: e.target.value })} maxLength={300} /></label>
            <div className="grid3">
              <label className="field">{t("Price (₹) *")}<input type="number" min={0} step="0.01" value={planForm.price} onChange={(e) => set({ price: e.target.value })} /></label>
              <label className="field">{t("Period (months)")}<input type="number" min={1} max={60} value={planForm.periodMonths} onChange={(e) => set({ periodMonths: e.target.value })} /></label>
              <label className="field">{t("Max people")} <span className="hint">{t("empty = no limit")}</span><input type="number" min={1} value={planForm.maxEmployees} onChange={(e) => set({ maxEmployees: e.target.value })} /></label>
            </div>
            <div className="field">{t("Modules")}
              {Object.entries(MODULE_LABELS).map(([moduleKey, moduleLabel]) => (
                <label key={moduleKey} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                  <input type="checkbox" checked={planForm.modules.includes(moduleKey)} onChange={(e) => set({ modules: e.target.checked ? [...planForm.modules, moduleKey] : planForm.modules.filter((selectedKey) => selectedKey !== moduleKey) })} />{t(moduleLabel)}
                </label>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={planForm.active} onChange={(e) => set({ active: e.target.checked })} />{t("Offered for new subscriptions")}
            </label>
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

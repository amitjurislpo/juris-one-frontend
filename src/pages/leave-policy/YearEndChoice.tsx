import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { useT } from "@/lib/i18n/client";
import type { LeavePolicy } from "@/lib/api-types";
import { useReadOnly } from "@/lib/session";
import { updateLeaveTypeYearEnd, type YearEndAction } from "./actions";

const CHOICES: { value: YearEndAction; label: string; hint: string }[] = [
  { value: "COLLAPSE", label: "Collapse", hint: "The balance of every employee becomes 0 when the leave year ends." },
  { value: "CARRY_ALL", label: "Carry forward all", hint: "The whole available balance moves to the next leave year." },
  { value: "CARRY_CAPPED", label: "Carry forward up to a limit", hint: "Up to the limit moves to the next leave year; the rest lapses." },
];

/** One leave type: what happens to its balance at the end of the leave year. */
export function YearEndChoice({ type }: { type: LeavePolicy["types"][number] }) {
  const t = useT();
  const toast = useToast();
  const isReadOnly = useReadOnly();
  const [action, setAction] = useState<YearEndAction>(type.yearEndAction);
  const [cap, setCap] = useState(type.carryForwardCap > 0 ? String(type.carryForwardCap) : "");
  const [error, setError] = useState("");
  const [isBusy, start] = useTransition();
  const savedCap = type.carryForwardCap > 0 ? String(type.carryForwardCap) : "";
  const isChanged = action !== type.yearEndAction || (action === "CARRY_CAPPED" && cap !== savedCap);
  return (
    <section className="card pad enter" aria-labelledby={`year-end-${type.code}`}>
      <div className="card-h"><h3 id={`year-end-${type.code}`}>{type.name}</h3><span className="muted">{t("At the end of the leave year")}</span></div>
      <fieldset className="col" style={{ gap: 10, border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only">{t("What happens to the {name} balance at the end of the leave year", { name: type.name })}</legend>
        {CHOICES.map((choice) => (
          <label key={choice.value} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <input type="radio" name={`year-end-${type.code}`} checked={action === choice.value} disabled={isReadOnly} onChange={() => setAction(choice.value)} style={{ marginTop: 4 }} />
            <span><b>{t(choice.label)}</b><br /><span className="muted" style={{ fontSize: 13 }}>{t(choice.hint)}</span></span>
          </label>
        ))}
      </fieldset>
      {action === "CARRY_CAPPED" && (
        <label className="field" style={{ marginTop: 12, maxWidth: 260 }}>{t("Days carried forward at most")}
          <input type="number" min={0.5} max={365} step={0.5} value={cap} disabled={isReadOnly} onChange={(e) => setCap(e.target.value)} />
        </label>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      {!isReadOnly && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn btn-gold" disabled={!isChanged || isBusy} onClick={() => start(async () => {
            setError("");
            const result = await updateLeaveTypeYearEnd(type.code, action, cap === "" ? null : Number(cap));
            if (result.ok) toast(result.message ?? t("Year-end choice saved")); else setError(result.error);
          })}>{isBusy ? t("Saving…") : t("Save")}</button>
          {isChanged && <button className="btn btn-ghost" onClick={() => { setAction(type.yearEndAction); setCap(savedCap); setError(""); }}>{t("Reset")}</button>}
        </div>
      )}
    </section>
  );
}

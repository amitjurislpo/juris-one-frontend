import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { formatDayMonthYear, MONTH_NAMES } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { LeavePolicy } from "@/lib/api-types";
import { useReadOnly } from "@/lib/session";
import { updateLeaveYear } from "./actions";

/** The month and day the leave year starts on; the year runs until the day before the next start. */
export function LeaveYearForm({ year }: { year: LeavePolicy["year"] }) {
  const t = useT();
  const toast = useToast();
  const isReadOnly = useReadOnly();
  const [month, setMonth] = useState(year.startMonth);
  const [day, setDay] = useState(year.startDay);
  const [error, setError] = useState("");
  const [isBusy, start] = useTransition();
  const isChanged = month !== year.startMonth || day !== year.startDay;
  return (
    <section className="card pad enter" aria-labelledby="leave-year-h">
      <div className="card-h"><h3 id="leave-year-h">{t("Leave year")}</h3><span className="muted">{t("Leave can only be applied inside the current leave year.")}</span></div>
      <p className="muted" style={{ margin: "0 0 12px", fontSize: 13.5 }}>{t("Current leave year: {from} to {to}", { from: formatDayMonthYear(year.currentFrom), to: formatDayMonthYear(year.currentTo) })}</p>
      <div className="grid3">
        <label className="field">{t("The leave year starts in")}
          <select value={month} disabled={isReadOnly} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((monthName, i) => <option key={monthName} value={i + 1}>{t(monthName)}</option>)}
          </select>
        </label>
        <label className="field">{t("On day")}
          <input type="number" min={1} max={31} step={1} value={day} disabled={isReadOnly} onChange={(e) => setDay(e.target.value === "" ? 0 : Number(e.target.value))} />
        </label>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {!isReadOnly && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn btn-gold" disabled={!isChanged || isBusy} onClick={() => start(async () => {
            setError("");
            const result = await updateLeaveYear(month, day);
            if (result.ok) toast(result.message ?? t("Leave year saved")); else setError(result.error);
          })}>{isBusy ? t("Saving…") : t("Save leave year")}</button>
          {isChanged && <button className="btn btn-ghost" onClick={() => { setMonth(year.startMonth); setDay(year.startDay); setError(""); }}>{t("Reset")}</button>}
        </div>
      )}
    </section>
  );
}

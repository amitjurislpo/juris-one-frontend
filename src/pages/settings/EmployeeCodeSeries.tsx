import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { PageLoading, useData } from "@/lib/page";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { updateEmployeeCodeSeries, type CodeSeriesMode } from "./actions";

/** How new employees get their code: the next number automatically (JSC01, JSC02, ...) or typed by HR every time. */
export function EmployeeCodeSeries() {
  const t = useT();
  const toast = useToast();
  const isReadOnly = useReadOnly();
  const saved = useData<{ mode: CodeSeriesMode }>("/api/v1/settings/employee-code-series");
  const [mode, setMode] = useState<CodeSeriesMode | null>(null);
  const [isBusy, start] = useTransition();
  if (!saved) return <PageLoading />;
  const current = mode ?? saved.mode;
  return (
    <section className="card enter" style={{ padding: 20 }}>
      <fieldset className="col" style={{ gap: 12, border: 0, padding: 0, margin: 0 }}>
        <legend className="eyebrow">{t("Employee code series")}</legend>
        <label className="row" style={{ gap: 10, alignItems: "flex-start" }}>
          <input type="radio" name="codeSeries" checked={current === "AUTO"} disabled={isReadOnly} onChange={() => setMode("AUTO")} style={{ marginTop: 4 }} />
          <span><b>{t("Auto")}</b><br /><span className="muted" style={{ fontSize: 13 }}>{t("The next number of the business code is given when an employee is added. HR can still type a code for one employee.")}</span></span>
        </label>
        <label className="row" style={{ gap: 10, alignItems: "flex-start" }}>
          <input type="radio" name="codeSeries" checked={current === "MANUAL"} disabled={isReadOnly} onChange={() => setMode("MANUAL")} style={{ marginTop: 4 }} />
          <span><b>{t("Manual")}</b><br /><span className="muted" style={{ fontSize: 13 }}>{t("HR must type the employee code every time an employee is added.")}</span></span>
        </label>
        <div>
          <button className="btn btn-gold" disabled={isReadOnly || isBusy || current === saved.mode} onClick={() => start(async () => {
            const result = await updateEmployeeCodeSeries(current);
            if (result.ok) { toast(result.message ?? t("Employee code series saved")); setMode(null); } else toast(result.error, "bad");
          })}>{isBusy ? t("Saving…") : t("Save")}</button>
        </div>
      </fieldset>
    </section>
  );
}

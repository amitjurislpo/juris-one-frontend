import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { formatDays, type SummaryCounters } from "./attendanceViews";

type Unit = "days" | "hours";

/** The counters under the views (payable days, present, on duty, paid leave, holidays, weekends; "More" adds unpaid leave, absent and late), as days or hours. */
export function AttendanceFooter({ counters, shiftName }: { counters: SummaryCounters; shiftName: string }) {
  const t = useT();
  const [unit, setUnit] = useState<Unit>("days");
  const [showMore, setShowMore] = useState(false);
  const value = (key: keyof SummaryCounters["hours"]) => (unit === "days" ? formatDays(counters[key]) : `${formatDays(counters.hours[key])}h`);
  const items: { label: string; value: string }[] = [
    { label: t("Payable days"), value: value("payableDays") },
    { label: t("Present"), value: value("present") },
    { label: t("On duty"), value: value("onDuty") },
    { label: t("Paid leave"), value: value("paidLeave") },
    { label: t("Holidays"), value: value("holidays") },
    { label: t("Weekend"), value: value("weekends") },
  ];
  const more: { label: string; value: string }[] = [
    { label: t("Unpaid leave"), value: value("unpaidLeave") },
    { label: t("Absent"), value: value("absent") },
    { label: t("Late"), value: String(counters.lateCount) },
  ];
  return (
    <section className="card pad enter att-footer" aria-label={t("Attendance totals")}>
      <div className="seg" role="group" aria-label={t("Show totals as")}>
        <button type="button" className={unit === "days" ? "on" : undefined} aria-pressed={unit === "days"} onClick={() => setUnit("days")}>{t("Days")}</button>
        <button type="button" className={unit === "hours" ? "on" : undefined} aria-pressed={unit === "hours"} onClick={() => setUnit("hours")}>{t("Hours")}</button>
      </div>
      <div className="att-counters">
        {[...items, ...(showMore ? more : [])].map((item) => <div key={item.label}><span className="muted">{item.label}</span><b className="num">{item.value}</b></div>)}
      </div>
      <button type="button" className="btn btn-sm btn-ghost" aria-expanded={showMore} onClick={() => setShowMore(!showMore)}>{showMore ? t("Fewer") : t("More")}</button>
      <span className="faint att-shift-name">{shiftName}</span>
    </section>
  );
}

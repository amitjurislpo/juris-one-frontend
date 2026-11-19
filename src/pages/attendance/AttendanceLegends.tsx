import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import type { CalendarDay } from "./AttendanceClient";
import { legendUse } from "./attendanceInfo";

interface LegendEntry { swatch: string; code: string; label: string }

/** The key to the calendar's colours, codes and marks; lists only what the month actually uses. Collapsible. */
export function AttendanceLegends({ days }: { days: CalendarDay[] }) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(true);
  const use = legendUse(days);
  const entries: LegendEntry[] = [
    ...(use.present ? [{ swatch: "present", code: "P", label: "Present" }] : []),
    ...(use.absent ? [{ swatch: "absent", code: "A", label: "Absent" }] : []),
    ...(use.offDay ? [{ swatch: "off", code: "O", label: "Off Day" }] : []),
    ...(use.leave ? [{ swatch: "leave", code: "L", label: "Leave" }] : []),
    ...(use.onDuty ? [{ swatch: "present", code: "OD", label: "On Duty" }] : []),
    ...(use.holiday ? [{ swatch: "holiday", code: "H", label: "Holiday" }] : []),
    ...(use.deductionAlert ? [{ swatch: "alert", code: "", label: "Alert for deduction" }] : []),
    ...(use.deduction ? [{ swatch: "absent", code: "", label: "Deduction" }] : []),
    ...(use.grace ? [{ swatch: "grace", code: "", label: "Grace" }] : []),
  ];
  const dayTypes: { icon: "moon" | "flag" | "clock"; label: string }[] = [
    ...(use.offDay ? [{ icon: "moon" as const, label: "Off Day" }] : []),
    ...(use.holiday ? [{ icon: "flag" as const, label: "Holiday" }] : []),
    ...(use.halfDay ? [{ icon: "clock" as const, label: "Half Day" }] : []),
  ];
  if (!entries.length && !dayTypes.length) return null;

  return (
    <div className="cal-legends">
      <button type="button" className="cal-legends-h" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <b>{t("Legends")}</b><span className="faint">{isOpen ? t("Hide") : t("Show")}</span>
      </button>
      {isOpen && (
        <div className="cal-legends-b">
          <ul aria-label={t("Legends")}>
            {entries.map((entry) => <li key={entry.label}><i className={`cal-swatch ${entry.swatch}`} aria-hidden="true">{entry.code}</i>{t(entry.label)}</li>)}
          </ul>
          {dayTypes.length > 0 && (
            <>
              <span className="eyebrow">{t("Day type")}</span>
              <ul aria-label={t("Day type")}>
                {dayTypes.map((entry) => <li key={entry.label}><i className="cal-swatch plain" aria-hidden="true"><Icon name={entry.icon} size={12} /></i>{t(entry.label)}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

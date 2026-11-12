import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { SegmentedFilter } from "@/components/table/Table";
import { useQuery } from "@/components/table/useQuery";
import { ConfirmDialog } from "@/components/ui/Modal";
import { toQueryString } from "@/lib/api";
import { formatDayMonth, formatDayMonthYear, formatMonthLabel, todayIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useData, usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { AssignShiftModal } from "./AssignShiftModal";
import { ManageShiftsModal } from "./ManageShiftsModal";
import { removeShiftAssignment } from "./shiftActions";
import { rosterPeriod, SHIFT_COLOUR_COUNT, shiftTimes, stepAnchor, type RosterLayout, type ShiftRoster } from "./shiftRoster";
import { ShiftRosterGrid } from "./ShiftRosterGrid";

/**
 * The Shift tab: who works which shift on which day. Everyone sees their own roster; Admin and HR (shifts.manage) see everyone's, assign shifts
 * in bulk and manage the shifts of the business. The layout and period live in the URL (?layout=monthly, ?anchor=2026-11-05).
 */
export function ShiftTab() {
  const t = useT();
  const toast = useToast();
  const { user, searchParams } = usePage();
  const readOnly = useReadOnly();
  const { set } = useQuery();
  const [busy, start] = useTransition();
  const [assigning, setAssigning] = useState(false);
  const [managing, setManaging] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const today = todayIn(user.timeZone);
  const layout: RosterLayout = searchParams.layout === "monthly" ? "monthly" : "weekly";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.anchor ?? "") ? searchParams.anchor : today;
  const { from, to } = rosterPeriod(layout, anchor);
  const canSeeEveryone = user.perms.has("shifts.manage") || user.perms.has("att.all");
  const roster = useData<ShiftRoster>(`/api/v1/attendance/shift-roster${toQueryString({ from, to, scope: canSeeEveryone ? "all" : "mine" })}`);
  if (!roster) return null;

  const period = layout === "weekly" ? `${formatDayMonth(from)} – ${formatDayMonthYear(to)}` : formatMonthLabel(from.slice(0, 7));
  const go = (direction: -1 | 1) => set({ anchor: stepAnchor(layout, anchor, direction) });
  const remove = () => start(async () => {
    const result = await removeShiftAssignment(removing!);
    if (!result.ok) { toast(result.error, "bad"); return; }
    toast(result.message ?? t("Shift assignment removed"), "ok");
    setRemoving(null);
  });

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="toolbar enter" style={{ flexWrap: "wrap", gap: 10 }}>
        <SegmentedFilter name="layout" dflt="weekly" label={t("Roster layout")} options={[{ value: "weekly", label: t("Weekly") }, { value: "monthly", label: t("Monthly") }]} />
        <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label={layout === "weekly" ? t("Previous week") : t("Previous month")}><Icon name="chevL" /></button>
        <b aria-live="polite">{period}</b>
        <button type="button" className="icon-btn" onClick={() => go(1)} aria-label={layout === "weekly" ? t("Next week") : t("Next month")}><Icon name="chevR" /></button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ anchor: null })}>{t("Today")}</button>
        <span style={{ flex: 1 }}></span>
        {roster.canManage && !readOnly && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setManaging(true)}>{t("Manage shifts")}</button>}
        {roster.canManage && !readOnly && <button type="button" className="btn btn-gold" onClick={() => setAssigning(true)}>{t("Assign shift")}</button>}
      </div>

      {roster.employees.length === 0 ? (
        <div className="empty enter"><b>{t("No shift roster")}</b><span className="muted">{t("Attendance is not tracked for you, so there is no roster to show.")}</span></div>
      ) : (
        <section className="card enter"><ShiftRosterGrid roster={roster} layout={layout} onOpenAssignment={(assignmentId) => { if (!readOnly) setRemoving(assignmentId); }} /></section>
      )}

      <div className="roster-legend" aria-label={t("Shifts")}>
        {roster.shifts.map((shift, index) => <span key={shift.id}><i className={`roster-swatch c${index % SHIFT_COLOUR_COUNT}`} />{shift.name} <span className="faint">{shiftTimes(shift)}</span></span>)}
      </div>
      {roster.canManage && <div className="faint" style={{ fontSize: 12.5 }}>{t("Click a day that is on the roster to remove that assignment.")}</div>}

      {assigning && <AssignShiftModal employees={roster.employees} shifts={roster.shifts} today={today} onClose={() => setAssigning(false)} />}
      {managing && <ManageShiftsModal shifts={roster.shifts} onClose={() => setManaging(false)} />}
      {removing && (
        <ConfirmDialog title={t("Remove shift assignment")} danger confirm={t("Remove")} busy={busy} onClose={() => setRemoving(null)} onConfirm={remove}
          body={t("The employee goes back to their own shift for all the dates of this assignment.")} />
      )}
    </div>
  );
}

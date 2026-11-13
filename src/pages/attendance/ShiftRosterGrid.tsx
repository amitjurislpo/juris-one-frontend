import { formatDayMonth, WEEKDAY_ABBREVIATIONS, isoToDate } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { blockOnTrack, clockLabel, SHIFT_COLOUR_COUNT, shiftTimes, spillOnTrack, type RosterLayout, type RosterShift, type ShiftRoster } from "./shiftRoster";

const AXIS_HOURS = ["12 AM", "6 AM", "12 PM", "6 PM"];

/**
 * The roster as a grid: one row per employee, one column per day. Weekly shows each day as a 24 hour track (12 AM to 11 PM) with the
 * shift as a block on it; Monthly shows one small coloured cell per day. A night shift runs to the end of its day and carries on at the start of the next.
 */
export function ShiftRosterGrid({ roster, layout, onOpenAssignment }: { roster: ShiftRoster; layout: RosterLayout; onOpenAssignment: (assignmentId: string) => void }) {
  const t = useT();
  const shiftById = new Map<string, { shift: RosterShift; colour: number }>(roster.shifts.map((shift, index) => [shift.id, { shift, colour: index % SHIFT_COLOUR_COUNT }]));
  const dates = roster.employees[0]?.days.map((day) => day.date) ?? [];
  const weekday = (date: string) => t(WEEKDAY_ABBREVIATIONS[isoToDate(date).getUTCDay()]);

  return (
    <div className="roster-scroll">
      <table className={`roster-grid ${layout}`}>
        <thead>
          <tr>
            <th className="roster-who">{t("Employee")}</th>
            {dates.map((date) => (
              <th key={date} className="roster-day">
                <span>{weekday(date)}</span>
                <b>{layout === "weekly" ? formatDayMonth(date) : Number(date.slice(8))}</b>
                {layout === "weekly" && <span className="roster-axis" aria-hidden="true">{AXIS_HOURS.map((hour) => <i key={hour}>{hour}</i>)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.employees.map((employee) => (
            <tr key={employee.id}>
              <th scope="row" className="roster-who"><b>{employee.name}</b><span className="faint">{employee.code}</span></th>
              {employee.days.map((day, index) => {
                const entry = day.shiftId ? shiftById.get(day.shiftId) : undefined;
                const previous = index > 0 && employee.days[index - 1].shiftId ? shiftById.get(employee.days[index - 1].shiftId!) : undefined;
                const spill = previous ? spillOnTrack(previous.shift) : 0;
                const label = entry ? `${entry.shift.name} · ${shiftTimes(entry.shift)}` : t("No shift");
                const open = roster.canManage && day.assignmentId ? () => onOpenAssignment(day.assignmentId!) : undefined;
                const body = layout === "weekly" ? (
                  <span className={`roster-track${day.isWeeklyOff ? " off" : ""}`}>
                    {spill > 0 && !day.isWeeklyOff && previous && <i className={`roster-block c${previous.colour} spill`} style={{ left: 0, width: `${spill}%` }} />}
                    {entry && !day.isWeeklyOff && <i className={`roster-block c${entry.colour}`} style={{ left: `${blockOnTrack(entry.shift).left}%`, width: `${blockOnTrack(entry.shift).width}%` }} />}
                    <span className="roster-text">{day.isWeeklyOff ? t("Weekly off") : entry ? <><b>{entry.shift.name}</b> {clockLabel(entry.shift.startLocal)}</> : "—"}</span>
                  </span>
                ) : (
                  <span className={`roster-chip${day.isWeeklyOff || !entry ? " off" : ` c${entry.colour}`}`}>{day.isWeeklyOff || !entry ? "–" : entry.shift.name.slice(0, 2).toUpperCase()}</span>
                );
                return (
                  <td key={day.date} className={`roster-day-cell${day.assignmentId ? " assigned" : ""}`} title={day.isWeeklyOff ? t("Weekly off") : label}>
                    {open ? <button type="button" className="roster-cell-button" onClick={open} aria-label={`${employee.name}, ${formatDayMonth(day.date)}: ${label}`}>{body}</button> : body}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

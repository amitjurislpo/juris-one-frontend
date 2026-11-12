import { useMemo, useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { DateField } from "@/components/ui/DateField";
import { Modal } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { useT } from "@/lib/i18n/client";
import { assignShift } from "./shiftActions";
import { shiftTimes, type RosterEmployee, type RosterShift } from "./shiftRoster";

/** Admin / HR: put one or more employees on a shift from a date to a date (empty end date = until changed). */
export function AssignShiftModal({ employees, shifts, today, onClose }: { employees: RosterEmployee[]; shifts: RosterShift[]; today: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState("");
  const shown = useMemo(() => employees.filter((employee) => `${employee.name} ${employee.code}`.toLowerCase().includes(search.trim().toLowerCase())), [employees, search]);
  const allShownSelected = shown.length > 0 && shown.every((employee) => selected.includes(employee.id));
  const ready = selected.length > 0 && shiftId !== "" && fromDate !== "" && (toDate === "" || toDate >= fromDate);

  const submit = () => start(async () => {
    const result = await assignShift({ employeeIds: selected, shiftId, fromDate, toDate: toDate || undefined });
    if (!result.ok) { toast(result.error, "bad"); return; }
    toast(t("{n} employees assigned", { n: selected.length }), "ok");
    onClose();
  });

  return (
    <Modal title={t("Assign shift")} eyebrow={t("Shift roster")} onClose={onClose}
      footer={<><span></span><div className="row" style={{ gap: 10 }}>
        <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn btn-gold" disabled={busy || !ready} onClick={submit}>{t("Assign")}</button>
      </div></>}>
      <div className="col" style={{ gap: 14 }}>
        <SelectField label={t("Shift")} isRequired value={shiftId} onChange={setShiftId} options={shifts.map((shift) => ({ value: shift.id, label: `${shift.name} · ${shiftTimes(shift)}` }))} />
        <div className="grid2">
          <DateField label={t("From")} isRequired value={fromDate} minDate={today} onChange={setFromDate} />
          <DateField label={t("Until (optional)")} value={toDate} minDate={fromDate} onChange={setToDate} />
        </div>
        <div>
          <div className="row" style={{ gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <b style={{ fontSize: 14 }}>{t("Employees")} <span className="faint">({selected.length})</span></b>
            <label className="row" style={{ gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={allShownSelected} onChange={(e) => setSelected(e.target.checked ? [...new Set([...selected, ...shown.map((employee) => employee.id)])] : selected.filter((id) => !shown.some((employee) => employee.id === id)))} />
              {t("Select all shown")}
            </label>
          </div>
          <input className="roster-search" value={search} placeholder={t("Search by name or code")} aria-label={t("Search employees")} onChange={(e) => setSearch(e.target.value)} />
          <div className="roster-picker">
            {shown.length === 0 && <span className="muted" style={{ padding: 10 }}>{t("No employees match.")}</span>}
            {shown.map((employee) => (
              <label key={employee.id} className="roster-picker-row">
                <input type="checkbox" checked={selected.includes(employee.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, employee.id] : selected.filter((id) => id !== employee.id))} />
                <span><b>{employee.name}</b> <span className="faint">{employee.code}</span></span>
              </label>
            ))}
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{t("Shifts can be assigned from today onwards. An employee who already has a shift in these dates is not changed: remove that assignment first.")}</p>
      </div>
    </Modal>
  );
}

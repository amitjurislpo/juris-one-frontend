import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { createShift, updateShift } from "./shiftActions";
import { shiftTimes, type RosterShift } from "./shiftRoster";

interface Draft { name: string; startLocal: string; endLocal: string }

const NEW_SHIFT: Draft = { name: "", startLocal: "09:00", endLocal: "18:00" };

function ShiftEditor({ draft, onChange }: { draft: Draft; onChange: (next: Draft) => void }) {
  const t = useT();
  return (
    <div className="roster-shift-editor">
      <label className="field">{t("Name")}<input value={draft.name} maxLength={40} onChange={(e) => onChange({ ...draft, name: e.target.value })} /></label>
      <label className="field">{t("Starts")}<input type="time" value={draft.startLocal} onChange={(e) => onChange({ ...draft, startLocal: e.target.value })} /></label>
      <label className="field">{t("Ends")}<input type="time" value={draft.endLocal} onChange={(e) => onChange({ ...draft, endLocal: e.target.value })} /></label>
    </div>
  );
}

/** Admin / HR: the shifts of this business (create and change); the built-in shifts are listed but fixed. A shift that ends before it starts runs past midnight. */
export function ManageShiftsModal({ shifts, onClose }: { shifts: RosterShift[]; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(NEW_SHIFT);
  const [creating, setCreating] = useState<Draft>(NEW_SHIFT);
  const isComplete = (value: Draft) => value.name.trim() !== "" && value.startLocal !== "" && value.endLocal !== "" && value.startLocal !== value.endLocal;

  const save = (id: string) => start(async () => {
    const result = await updateShift(id, { name: draft.name.trim(), startLocal: draft.startLocal, endLocal: draft.endLocal });
    if (!result.ok) { toast(result.error, "bad"); return; }
    toast(result.message ?? t("Shift saved"), "ok");
    setEditing(null);
  });
  const add = () => start(async () => {
    const result = await createShift({ name: creating.name.trim(), startLocal: creating.startLocal, endLocal: creating.endLocal });
    if (!result.ok) { toast(result.error, "bad"); return; }
    toast(result.message ?? t("Shift created"), "ok");
    setCreating(NEW_SHIFT);
  });

  return (
    <Modal title={t("Manage shifts")} eyebrow={t("Shift roster")} onClose={onClose} footer={<><span></span><button className="btn btn-ghost" onClick={onClose}>{t("Close")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="col" style={{ gap: 8 }}>
          {shifts.map((shift) => editing === shift.id ? (
            <div key={shift.id} className="card pad col" style={{ gap: 10 }}>
              <ShiftEditor draft={draft} onChange={setDraft} />
              <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>{t("Cancel")}</button>
                <button className="btn btn-sm btn-gold" disabled={busy || !isComplete(draft)} onClick={() => save(shift.id)}>{t("Save")}</button>
              </div>
            </div>
          ) : (
            <div key={shift.id} className="row" style={{ gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <span><b>{shift.name}</b> <span className="muted">{shiftTimes(shift)}</span>{shift.crossesMidnight ? <span className="chip neutral" style={{ marginLeft: 8 }}>{t("Past midnight")}</span> : null}</span>
              {shift.isCustom
                ? <button className="btn btn-sm btn-ghost" onClick={() => { setEditing(shift.id); setDraft({ name: shift.name, startLocal: shift.startLocal, endLocal: shift.endLocal }); }}>{t("Edit")}</button>
                : <span className="chip neutral">{t("Built-in")}</span>}
            </div>
          ))}
        </div>
        <div className="card pad col" style={{ gap: 10 }}>
          <b style={{ fontSize: 14 }}>{t("New shift")}</b>
          <ShiftEditor draft={creating} onChange={setCreating} />
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-sm btn-gold" disabled={busy || !isComplete(creating)} onClick={add}>{t("Add shift")}</button>
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{t("Changing a shift changes it for everyone on it. Attendance of closed months does not change.")}</p>
      </div>
    </Modal>
  );
}

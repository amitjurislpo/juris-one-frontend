import { useState, useTransition } from "react";
import { useDismissOnEdit } from "@/lib/useDismissOnEdit";
import { Modal } from "@/components/ui/Modal";
import type { ProjectVisibility } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { PROJECT_COLORS, suggestProjectKey, VISIBILITIES } from "@/lib/tasks";
import { createProject } from "./actions";

/** "New project": name, key (suggested from the name), description, who can see it, colour and (optionally) department. */
export function ProjectFormModal({ departments, onClose, onCreated }: { departments: { id: string; name: string }[]; onClose: () => void; onCreated: (projectId: string) => void }) {
  const t = useT();
  const [form, setForm] = useState({ name: "", key: "", description: "", visibility: "PRIVATE" as ProjectVisibility, color: "purple", departmentId: "" });
  const [isKeyTouched, setIsKeyTouched] = useState(false);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  useDismissOnEdit(error, () => setError(""), form);
  const save = () => start(async () => {
    if (!form.name.trim()) { setError(t("Enter a project name.")); return; }
    if (!/^[A-Z][A-Z0-9]{1,5}$/.test(form.key)) { setError(t("The key is 2 to 6 capital letters or digits and starts with a letter, e.g. WEB.")); return; }
    const result = await createProject({ key: form.key, name: form.name.trim(), description: form.description.trim() || null, visibility: form.visibility, color: form.color, departmentId: form.departmentId || null });
    if (result.ok && result.data) { onClose(); onCreated(result.data.id); } else if (!result.ok) setError(result.error);
  });
  return (
    <Modal title={t("New project")} eyebrow={t("Tasks")} onClose={onClose} size="sm"
      footer={<><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Create project")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <label className="field">{t("Name *")}
          <input value={form.name} maxLength={80} autoFocus onChange={(e) => { const name = e.target.value; setForm({ ...form, name, key: isKeyTouched ? form.key : suggestProjectKey(name) }); setError(""); }} />
        </label>
        <label className="field">{t("Key *")} <span className="hint">{t("in task numbers, e.g. WEB-12")}</span>
          <input value={form.key} maxLength={6} onChange={(e) => { setIsKeyTouched(true); setForm({ ...form, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }); setError(""); }} />
        </label>
        <label className="field">{t("Description")} <span className="hint">{t("optional")}</span><textarea rows={2} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <fieldset className="task-visibility">
          <legend>{t("Visibility")}</legend>
          {(Object.keys(VISIBILITIES) as ProjectVisibility[]).map((visibility) => (
            <label key={visibility} className="task-visibility-option">
              <input type="radio" name="visibility" checked={form.visibility === visibility} onChange={() => setForm({ ...form, visibility })} />
              <span><b>{t(VISIBILITIES[visibility].label)}</b><small className="muted">{t(VISIBILITIES[visibility].hint)}</small></span>
            </label>
          ))}
        </fieldset>
        <div className="grid2">
          <label className="field">{t("Colour")}<select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>{Object.entries(PROJECT_COLORS).map(([value, color]) => <option key={value} value={value}>{t(color.label)}</option>)}</select></label>
          {departments.length > 0 && (
            <label className="field">{t("Department")} <span className="hint">{t("optional")}</span>
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">{t("None")}</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
          )}
        </div>
        {error && <div className="err" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}

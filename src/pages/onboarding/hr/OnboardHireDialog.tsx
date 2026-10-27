import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { EmployeeInput } from "@/lib/employee-schema";
import { useT } from "@/lib/i18n/client";
import { LOCATIONS } from "@/lib/people-rules";
import { useRouter } from "@/lib/router";
import { SHIFT_OPTIONS } from "@/lib/shifts";
import { getFormOptions, type FormOptions } from "@/pages/employees/actions";
import { createOnboarding } from "./actions";
import { newHireErrors, newHireInput } from "./hireForm";

/** "Onboard employee": the minimal master data, then the invitation email goes out and HR lands on the employee's onboarding page. */
export function OnboardHireDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<EmployeeInput | null>(null);
  const [isTried, setIsTried] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isBusy, start] = useTransition();

  useEffect(() => {
    let isCurrent = true;
    getFormOptions().then((result) => {
      if (!isCurrent) return;
      if (result.ok) { setOptions(result.data!); setForm(result.data!.defaults); } else setLoadError(result.error);
    });
    return () => { isCurrent = false; };
  }, []);

  const errors = form ? newHireErrors(form) : {};
  const isIndia = !form?.location || form.location === "IN_IST";
  const set = <FieldName extends keyof EmployeeInput>(fieldName: FieldName, fieldValue: EmployeeInput[FieldName]) => {
    setServerError("");
    setForm((current) => {
      if (!current) return current;
      const next = { ...current, [fieldName]: fieldValue };
      if (fieldName === "location") next.shift = !fieldValue || fieldValue === "IN_IST" ? (current.shift === "US_DAY" ? "IN_NIGHT" : current.shift) : "US_DAY";
      if (fieldName === "departmentId" && !options?.lockedDepartmentId) {
        const head = options?.departments.find((department) => department.id === fieldValue)?.headId;
        if (head && (!current.managerId || options?.departments.some((department) => department.headId === current.managerId))) next.managerId = head;
      }
      return next;
    });
  };
  const error = (fieldName: keyof EmployeeInput) => (isTried && errors[fieldName] ? <span className="err">{t(errors[fieldName]!)}</span> : null);

  const submit = () => {
    setIsTried(true);
    if (!form || Object.keys(errors).length > 0) return;
    start(async () => {
      const result = await createOnboarding(newHireInput(form));
      if (result.ok) {
        toast(t("Invitation sent to {email}", { email: form.email.trim() }));
        onClose();
        if (result.data?.employeeId) router.push(`/onboarding/hires/${encodeURIComponent(result.data.employeeId)}`);
      } else setServerError(result.error);
    });
  };

  return (
    <Modal title={t("Onboard employee")} eyebrow={options ? t("New hire · {code}", { code: options.nextCode }) : t("Loading…")} onClose={onClose} maxWidth={760}
      footer={options && form ? (
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
          <button type="button" className="btn btn-gold" disabled={isBusy} onClick={submit}>{isBusy ? t("Saving…") : t("Send invitation")}<Icon name="arrow" size={16} /></button>
        </>
      ) : undefined}>
      {loadError && <div className="err" role="alert">{loadError}</div>}
      {!options && !loadError && <div className="faint">{t("Loading…")}</div>}
      {options && form && (
        <div className="col" style={{ gap: 14 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{t("The employee gets an email invitation and fills in the rest of the details after signing in. You can also fill them in on the employee's behalf.")}</p>
          <div className="grid2">
            <label className="field">{t("First name *")}<input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder={t("e.g. Meera")} maxLength={60} autoFocus />{error("firstName")}</label>
            <label className="field">{t("Last name *")}<input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder={t("e.g. Joshi")} maxLength={60} />{error("lastName")}</label>
            <label className="field">{t("Work email *")}<input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="meera.joshi@company.com" maxLength={200} />{error("email")}</label>
            <div className="field">{t("Phone")} *
              <PhoneInput code={form.phoneCountry || "+91"} number={form.phone} onChange={(code, number) => { set("phoneCountry", code); set("phone", number); }} />
              {error("phone")}
            </div>
            <label className="field">{t("Date of joining *")}<input type="date" value={form.dateOfJoining} onChange={(e) => set("dateOfJoining", e.target.value)} />{error("dateOfJoining")}</label>
            <label className="field">{t("Designation *")}<input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder={t("e.g. Associate — Contract Review")} maxLength={120} />{error("designation")}</label>
            <label className="field">{t("Department *")}
              <select value={form.departmentId} disabled={!!options.lockedDepartmentId} onChange={(e) => set("departmentId", e.target.value)}>
                <option value="" disabled>{t("Select a department")}</option>
                {options.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
              {error("departmentId")}
            </label>
            <label className="field">{t("Reporting manager *")}
              <select value={form.managerId} onChange={(e) => set("managerId", e.target.value)}>
                <option value="">{t("Select a manager")}</option>
                {options.managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} — {manager.title}</option>)}
              </select>
              {error("managerId")}
            </label>
            <label className="field">{t("Role *")}
              <select value={form.roleId} onChange={(e) => set("roleId", e.target.value)}>
                <option value="" disabled>{t("Pick a role")}</option>
                {options.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              {error("roleId")}
            </label>
            <label className="field">{t("Work location")} <span className="hint">{t("optional · India if not set")}</span>
              <select value={form.location} onChange={(e) => set("location", e.target.value)}>
                <option value="">{t("Not set (India)")}</option>
                {LOCATIONS.map((location) => <option key={location.value} value={location.value}>{t(location.label)}</option>)}
              </select>
            </label>
            <label className="field">{t("Shift")}
              <select value={form.shift} disabled={!isIndia} onChange={(e) => set("shift", e.target.value as EmployeeInput["shift"])}>
                {(isIndia ? SHIFT_OPTIONS.IN : SHIFT_OPTIONS.US).map((shift) => <option key={shift.value} value={shift.value}>{t(shift.label)}</option>)}
              </select>
            </label>
          </div>
          {serverError && <div className="err" role="alert">{serverError}</div>}
        </div>
      )}
    </Modal>
  );
}

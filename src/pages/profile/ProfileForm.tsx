
import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { phoneProblem } from "@/lib/phone";
import { saveMyProfile } from "./actions";

export interface MyProfile {
  code: string; fullName: string; firstName: string; middleName: string; lastName: string; email: string; phone: string | null; designation: string;
  department: string | null; manager: string | null; role: string; dateOfJoining: string; joiningOffice: string | null; location: string; shift: string | null;
  pan: string | null; aadhaar: string | null; bank: string | null;
  fatherName: string; dateOfBirth: string; currentAddress: string; permanentAddress: string; emergencyName: string; emergencyRelation: string;
  emergencyPhoneCountry: string; emergencyPhone: string;
  documents: { id: string; kind: string; label: string; fileName: string }[];
}

/** The details an employee edits themselves. */
export function ProfileForm({ profile }: { profile: MyProfile }) {
  const toast = useToast();
  const t = useT();
  const readOnly = useReadOnly();
  const init = { fatherName: profile.fatherName, dateOfBirth: profile.dateOfBirth, currentAddress: profile.currentAddress, permanentAddress: profile.permanentAddress,
    emergencyName: profile.emergencyName, emergencyRelation: profile.emergencyRelation, emergencyPhoneCountry: profile.emergencyPhoneCountry || "+91", emergencyPhone: profile.emergencyPhone };
  const [profileForm, setF] = useState(init);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const onFieldChange = (fieldName: keyof typeof profileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...profileForm, [fieldName]: e.target.value }); setErr(""); };
  const dirty = JSON.stringify(profileForm) !== JSON.stringify(init);
  const save = () => {
    if (profileForm.fatherName.trim().length < 2) return setErr(t("Enter your father's name."));
    if (profileForm.emergencyPhone) { const phoneError = phoneProblem(profileForm.emergencyPhoneCountry, profileForm.emergencyPhone); if (phoneError) return setErr(t("Emergency contact: {problem}", { problem: phoneError })); }
    start(async () => {
      const saveResult = await saveMyProfile(profileForm);
      if (saveResult.ok) toast(saveResult.message!); else setErr(saveResult.error);
    });
  };
  return (
    <section className="card" style={{ padding: 18 }}>
      <div className="card-h"><h3>{t("Personal details")}</h3>{!readOnly && <small className="muted">{t("You can edit these")}</small>}</div>
      <fieldset disabled={readOnly} className="col" style={{ gap: 12, border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="grid2">
          <label className="field">{t("Father's name *")}<input value={profileForm.fatherName} onChange={onFieldChange("fatherName")} maxLength={120} /></label>
          <label className="field">{t("Date of birth")}<input type="date" value={profileForm.dateOfBirth} onChange={onFieldChange("dateOfBirth")} /></label>
        </div>
        <label className="field">{t("Current address")}<textarea value={profileForm.currentAddress} onChange={onFieldChange("currentAddress")} rows={2} maxLength={500} /></label>
        <label className="field">{t("Permanent address")}<textarea value={profileForm.permanentAddress} onChange={onFieldChange("permanentAddress")} rows={2} maxLength={500} /></label>
        <div className="grid2">
          <label className="field">{t("Emergency contact")}<input value={profileForm.emergencyName} onChange={onFieldChange("emergencyName")} maxLength={120} /></label>
          <label className="field">{t("Relationship")}<input value={profileForm.emergencyRelation} onChange={onFieldChange("emergencyRelation")} maxLength={40} /></label>
        </div>
        <div className="field">{t("Their phone")}
          <PhoneInput label={t("Emergency contact phone")} code={profileForm.emergencyPhoneCountry} number={profileForm.emergencyPhone} onChange={(countryCode, phoneNumber) => { setF({ ...profileForm, emergencyPhoneCountry: countryCode, emergencyPhone: phoneNumber }); setErr(""); }} />
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        {!readOnly && <div><button className="btn btn-gold" disabled={busy || !dirty} onClick={save}>{busy ? t("Saving…") : t("Save")}</button></div>}
      </fieldset>
    </section>
  );
}

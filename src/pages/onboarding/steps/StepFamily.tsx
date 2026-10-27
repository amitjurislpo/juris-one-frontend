import { Icon } from "@/components/Icon";
import { DateField } from "@/components/ui/DateField";
import { RepeatableBlock } from "@/components/ui/RepeatableBlock";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useT } from "@/lib/i18n/client";
import type { FamilyMember, FieldErrors, Guardian } from "../types";
import { BLOOD_GROUP_OPTIONS, FAMILY_GENDERS, FAMILY_NATIONALITIES, FAMILY_RELATIONSHIPS, emptyFamilyMember, emptyGuardian, isUnderAge } from "../validation/family";

export function StepFamily({ value, onChange, errors, isReadOnly }: { value: FamilyMember[]; onChange: (next: FamilyMember[]) => void; errors: FieldErrors; isReadOnly: boolean }) {
  const t = useT();
  const today = new Date().toISOString().slice(0, 10);

  const update = (index: number, changes: Partial<FamilyMember>) => onChange(value.map((member, position) => (position === index ? { ...member, ...changes } : member)));
  const updateGuardian = (index: number, changes: Partial<Guardian>) => update(index, { guardian: { ...(value[index].guardian ?? emptyGuardian()), ...changes } });
  const setMinor = (index: number, isMinor: boolean) => update(index, { isMinor, guardian: isMinor ? value[index].guardian ?? emptyGuardian() : null });
  const setDateOfBirth = (index: number, dateOfBirth: string) => {
    if (isUnderAge(dateOfBirth) && !value[index].isMinor) update(index, { dateOfBirth, isMinor: true, guardian: value[index].guardian ?? emptyGuardian() });
    else update(index, { dateOfBirth });
  };
  const error = (index: number, field: string) => { const message = errors[`familyMembers[${index}].${field}`]; return message ? t(message) : undefined; };
  const hasBlockError = (index: number) => Object.keys(errors).some((key) => key.startsWith(`familyMembers[${index}].`));

  return (
    <div className="stack">
      <h3>{t("Family Details")}</h3>
      {value.length === 0 && <p className="hint">{t("No family members added yet.")}</p>}
      {value.map((member, index) => {
        const guardian = member.guardian ?? emptyGuardian();
        return (
          <RepeatableBlock key={member.id ?? `new-${index}`} title={t("Member {number}", { number: index + 1 })} onRemove={isReadOnly ? undefined : () => onChange(value.filter((_, position) => position !== index))}>
            {hasBlockError(index) && <p className="err field-wide" role="alert">{t("Some information is missing or invalid")}</p>}
            <TextField label={t("Name")} isRequired isDisabled={isReadOnly} value={member.name} error={error(index, "name")} onChange={(next) => update(index, { name: next })} />
            <SelectField label={t("Relationship")} isRequired isDisabled={isReadOnly} value={member.relationship} options={FAMILY_RELATIONSHIPS} error={error(index, "relationship")} onChange={(next) => update(index, { relationship: next })} />
            <DateField label={t("DOB")} isRequired isDisabled={isReadOnly} value={member.dateOfBirth} maxDate={today} error={error(index, "dateOfBirth")} onChange={(next) => setDateOfBirth(index, next)} />
            <SelectField label={t("Gender")} isRequired isDisabled={isReadOnly} value={member.gender} options={FAMILY_GENDERS} error={error(index, "gender")} onChange={(next) => update(index, { gender: next })} />
            <SelectField label={t("Blood Group")} isRequired isDisabled={isReadOnly} value={member.bloodGroup} options={BLOOD_GROUP_OPTIONS} error={error(index, "bloodGroup")} onChange={(next) => update(index, { bloodGroup: next })} />
            <SelectField label={t("Nationality")} isRequired isDisabled={isReadOnly} value={member.nationality} options={FAMILY_NATIONALITIES} error={error(index, "nationality")} onChange={(next) => update(index, { nationality: next })} />
            <label className="check-row"><input type="checkbox" checked={member.isMinor} disabled={isReadOnly} onChange={(event) => setMinor(index, event.target.checked)} /> {t("Minor")}</label>
            <label className="check-row"><input type="checkbox" checked={member.hasMentalIllness} disabled={isReadOnly} onChange={(event) => update(index, { hasMentalIllness: event.target.checked })} /> {t("Mental Illness")}</label>
            {member.isMinor && (
              <>
                <h4 className="field-wide">{t("Guardian Details")}</h4>
                <TextField label={t("Guardian Name")} isRequired isDisabled={isReadOnly} value={guardian.name} error={error(index, "guardian.name")} onChange={(next) => updateGuardian(index, { name: next })} />
                <TextField label={t("Relationship")} isRequired isDisabled={isReadOnly} value={guardian.relationship} error={error(index, "guardian.relationship")} onChange={(next) => updateGuardian(index, { relationship: next })} />
                <TextField label={t("Address Line 1")} isDisabled={isReadOnly} value={guardian.line1} onChange={(next) => updateGuardian(index, { line1: next })} />
                <TextField label={t("Address Line 2")} isDisabled={isReadOnly} value={guardian.line2} onChange={(next) => updateGuardian(index, { line2: next })} />
                <TextField label={t("Address Line 3")} isDisabled={isReadOnly} value={guardian.line3} onChange={(next) => updateGuardian(index, { line3: next })} />
                <TextField label={t("City")} isDisabled={isReadOnly} value={guardian.city} onChange={(next) => updateGuardian(index, { city: next })} />
                <TextField label={t("State")} isDisabled={isReadOnly} value={guardian.state} onChange={(next) => updateGuardian(index, { state: next })} />
                <TextField label={t("Country")} isDisabled={isReadOnly} value={guardian.country} onChange={(next) => updateGuardian(index, { country: next })} />
                <TextField label={t("Pin")} isDisabled={isReadOnly} value={guardian.pin} inputMode="numeric" maxLength={6} onChange={(next) => updateGuardian(index, { pin: next })} />
                <TextField label={t("Mobile")} isRequired isDisabled={isReadOnly} value={guardian.mobile} inputMode="tel" maxLength={10} error={error(index, "guardian.mobile")} onChange={(next) => updateGuardian(index, { mobile: next })} />
                <TextField label={t("Email")} isDisabled={isReadOnly} type="email" value={guardian.email} error={error(index, "guardian.email")} onChange={(next) => updateGuardian(index, { email: next })} />
              </>
            )}
          </RepeatableBlock>
        );
      })}
      {!isReadOnly && (
        <button type="button" className="linklike" onClick={() => onChange([...value, emptyFamilyMember()])}>
          <Icon name="plus" size={14} /> {t("Add another member")}
        </button>
      )}
    </div>
  );
}

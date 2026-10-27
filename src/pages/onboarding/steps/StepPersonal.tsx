import { useEffect, useState } from "react";
import { Accordion } from "@/components/ui/Accordion";
import { DateField } from "@/components/ui/DateField";
import { RepeatableBlock } from "@/components/ui/RepeatableBlock";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { YearSelect } from "@/components/ui/YearSelect";
import { useT } from "@/lib/i18n/client";
import { copyPermanentAddress, emptyCourse, emptyEducation, type PersonalStepValue } from "../draft";
import {
  COUNTRIES, DISABILITY_TYPES, EMERGENCY_RELATIONSHIPS, GENDERS, MARITAL_STATUSES, NATIONALITIES, QUALIFICATIONS, RELIGIONS,
} from "../options";
import type { Address, Course, Education, EmergencyContact, FieldErrors, PersonalInformation, ReviewSection } from "../types";
import { errorFor, todayIso } from "../validation/common";
import { BLOOD_GROUP_OPTIONS } from "../validation/family";
import { personalSectionProblems } from "../validation/personal";
import { digitsOnly } from "../validation/statutory";
import { AddressFields } from "./AddressFields";

const toYesNo = (answer: boolean | null): string => (answer === null ? "" : answer ? "yes" : "no");
const fromYesNo = (answer: string): boolean | null => (answer === "" ? null : answer === "yes");

/** Step 1: three accordion sections (Personal Information, Address, Qualifications), saved once for the whole step. */
export function StepPersonal({ value, onChange, errors, isReadOnly, flagComments }: {
  value: PersonalStepValue; onChange: (next: PersonalStepValue) => void; errors: FieldErrors; isReadOnly: boolean;
  /** HR's comment per flagged section of this step (a flagged section has a red outline and shows its comment under the header). */
  flagComments: Partial<Record<ReviewSection, string>>;
}) {
  const t = useT();
  const [openSections, setOpenSections] = useState<boolean[]>([true, false, false]);
  const problems = personalSectionProblems(errors);
  const problemSignature = problems.join();
  // a failed save opens the sections that hold errors
  useEffect(() => {
    if (problemSignature.includes("true")) setOpenSections((open) => open.map((isOpen, index) => isOpen || problemSignature.split(",")[index] === "true"));
  }, [problemSignature]);
  const toggle = (index: number) => setOpenSections((open) => open.map((isOpen, position) => (position === index ? !isOpen : isOpen)));

  const { personal, permanentAddress, presentAddress, emergencyContact } = value;
  const error = (path: string) => errorFor(errors, path, t);
  const setPersonal = (changes: Partial<PersonalInformation>) => onChange({ ...value, personal: { ...personal, ...changes } });
  const setEmergency = (changes: Partial<EmergencyContact>) => onChange({ ...value, emergencyContact: { ...emergencyContact, ...changes } });
  const setPermanent = (next: Address) => onChange({ ...value, permanentAddress: next, presentAddress: presentAddress.isSameAsPermanent ? copyPermanentAddress(next) : presentAddress });
  const setSameAsPermanent = (isSame: boolean) => onChange({ ...value, presentAddress: isSame ? copyPermanentAddress(permanentAddress) : { ...presentAddress, isSameAsPermanent: false } });
  const setMaritalStatus = (maritalStatus: string) => setPersonal(maritalStatus === "Married" ? { maritalStatus } : { maritalStatus, marriageDate: "", spouseName: "" });
  const setPhysicallyChallenged = (answer: string) => setPersonal(fromYesNo(answer) === true ? { isPhysicallyChallenged: true } : { isPhysicallyChallenged: fromYesNo(answer), disabilityType: "" });
  const yesNoOptions = [{ value: "yes", label: t("Yes") }, { value: "no", label: t("No") }];

  const setEducation = (index: number, changes: Partial<Education>) => onChange({ ...value, education: value.education.map((item, position) => (position === index ? { ...item, ...changes } : item)) });
  const setCourse = (index: number, changes: Partial<Course>) => onChange({ ...value, courses: value.courses.map((item, position) => (position === index ? { ...item, ...changes } : item)) });
  const isMarried = personal.maritalStatus === "Married";

  return (
    <div>
      <Accordion number={1} title={t("Personal Information")} isOpen={openSections[0]} onToggle={() => toggle(0)} hasProblem={problems[0]} flagComment={flagComments.PERSONAL}>
        <div className="form-grid">
          <SelectField label={t("Blood Group")} value={personal.bloodGroup} onChange={(bloodGroup) => setPersonal({ bloodGroup })} options={BLOOD_GROUP_OPTIONS} isRequired isDisabled={isReadOnly} error={error("personal.bloodGroup")} />
          <TextField label={t("Personal Email")} type="email" value={personal.personalEmail} onChange={(personalEmail) => setPersonal({ personalEmail })} isRequired isDisabled={isReadOnly} error={error("personal.personalEmail")} />
          <TextField label={t("Father name")} value={personal.fatherName} onChange={(fatherName) => setPersonal({ fatherName })} isRequired isDisabled={isReadOnly} error={error("personal.fatherName")} />
          <SelectField label={t("Marital Status")} value={personal.maritalStatus} onChange={setMaritalStatus} options={MARITAL_STATUSES.map((status) => ({ value: status, label: t(status) }))} isRequired isDisabled={isReadOnly} error={error("personal.maritalStatus")} />
          <DateField label={t("Marriage Date")} value={personal.marriageDate} onChange={(marriageDate) => setPersonal({ marriageDate })} isRequired={isMarried} isDisabled={isReadOnly || !isMarried} error={error("personal.marriageDate")} />
          <TextField label={t("Spouse Name")} value={personal.spouseName} onChange={(spouseName) => setPersonal({ spouseName })} isDisabled={isReadOnly || !isMarried} error={error("personal.spouseName")} />
          <SelectField label={t("Country Of Origin")} value={personal.countryOfOrigin} onChange={(countryOfOrigin) => setPersonal({ countryOfOrigin })} options={COUNTRIES} isRequired isDisabled={isReadOnly} error={error("personal.countryOfOrigin")} />
          <SelectField label={t("Nationality")} value={personal.nationality} onChange={(nationality) => setPersonal({ nationality })} options={NATIONALITIES.map((nationality) => ({ value: nationality, label: t(nationality) }))} isRequired isDisabled={isReadOnly} error={error("personal.nationality")} />
          <SelectField label={t("International Employee")} value={toYesNo(personal.isInternationalEmployee)} onChange={(answer) => setPersonal({ isInternationalEmployee: fromYesNo(answer) })} options={yesNoOptions} isRequired isDisabled={isReadOnly} error={error("personal.isInternationalEmployee")} />
          <SelectField label={t("Physically Challenged")} value={toYesNo(personal.isPhysicallyChallenged)} onChange={setPhysicallyChallenged} options={yesNoOptions} isRequired isDisabled={isReadOnly} error={error("personal.isPhysicallyChallenged")} />
          <SelectField label={t("Disability Type")} value={personal.disabilityType} onChange={(disabilityType) => setPersonal({ disabilityType })} options={DISABILITY_TYPES.map((type) => ({ value: type, label: t(type) }))} isRequired={personal.isPhysicallyChallenged === true} isDisabled={isReadOnly || personal.isPhysicallyChallenged !== true} error={error("personal.disabilityType")} />
          <SelectField label={t("Gender")} value={personal.gender} onChange={(gender) => setPersonal({ gender })} options={GENDERS.map((gender) => ({ value: gender, label: t(gender) }))} isDisabled={isReadOnly} error={error("personal.gender")} />
          <DateField label={t("Date of Birth")} value={personal.dateOfBirth} onChange={(dateOfBirth) => setPersonal({ dateOfBirth })} maxDate={todayIso()} isDisabled={isReadOnly} error={error("personal.dateOfBirth")} />
          <TextField label={t("Height (cm)")} type="number" inputMode="decimal" value={personal.heightCm} onChange={(heightCm) => setPersonal({ heightCm })} isDisabled={isReadOnly} error={error("personal.heightCm")} />
          <TextField label={t("Weight (kg)")} type="number" inputMode="decimal" value={personal.weightKg} onChange={(weightKg) => setPersonal({ weightKg })} isDisabled={isReadOnly} error={error("personal.weightKg")} />
          <TextField label={t("Identification Mark")} value={personal.identificationMark} onChange={(identificationMark) => setPersonal({ identificationMark })} isDisabled={isReadOnly} error={error("personal.identificationMark")} />
          <SelectField label={t("Religion")} value={personal.religion} onChange={(religion) => setPersonal({ religion })} options={RELIGIONS.map((religion) => ({ value: religion, label: t(religion) }))} isDisabled={isReadOnly} error={error("personal.religion")} />
          <TextField label={t("Caste")} value={personal.caste} onChange={(caste) => setPersonal({ caste })} isDisabled={isReadOnly} error={error("personal.caste")} />
          <TextField label={t("Hobby")} value={personal.hobby} onChange={(hobby) => setPersonal({ hobby })} isDisabled={isReadOnly} error={error("personal.hobby")} />
        </div>
      </Accordion>

      <Accordion number={2} title={t("Address")} isOpen={openSections[1]} onToggle={() => toggle(1)} hasProblem={problems[1]} flagComment={flagComments.ADDRESS}>
        <h3 className="wizard-subheading">{t("Permanent Address")}</h3>
        <AddressFields path="permanentAddress" value={permanentAddress} onChange={setPermanent} errors={errors} isDisabled={isReadOnly} />
        <h3 className="wizard-subheading">{t("Present Address")}</h3>
        <label className="check-row" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={presentAddress.isSameAsPermanent} disabled={isReadOnly} onChange={(event) => setSameAsPermanent(event.target.checked)} />
          {t("Same as above")}
        </label>
        <AddressFields path="presentAddress" value={presentAddress} onChange={(next) => onChange({ ...value, presentAddress: { ...next, isSameAsPermanent: false } })} errors={errors} isDisabled={isReadOnly || presentAddress.isSameAsPermanent} />
        <h3 className="wizard-subheading">{t("Emergency Contact/Address")}</h3>
        <div className="form-grid">
          <TextField label={t("Name")} value={emergencyContact.name} onChange={(name) => setEmergency({ name })} isRequired isDisabled={isReadOnly} error={error("emergencyContact.name")} />
          <TextField label={t("Mobile Number")} value={emergencyContact.mobile} onChange={(mobile) => setEmergency({ mobile: digitsOnly(mobile, 10) })} isRequired isDisabled={isReadOnly} error={error("emergencyContact.mobile")} inputMode="tel" maxLength={10} />
          <SelectField label={t("Relationship")} value={emergencyContact.relationship} onChange={(relationship) => setEmergency({ relationship })} options={EMERGENCY_RELATIONSHIPS.map((relationship) => ({ value: relationship, label: t(relationship) }))} isRequired isDisabled={isReadOnly} error={error("emergencyContact.relationship")} />
        </div>
      </Accordion>

      <Accordion number={3} title={t("Qualifications")} isOpen={openSections[2]} onToggle={() => toggle(2)} hasProblem={problems[2]} flagComment={flagComments.QUALIFICATIONS}>
        {value.education.map((education, index) => (
          <RepeatableBlock key={education.id ?? `new-${index}`} title={t("Education {number}", { number: index + 1 })}
            onRemove={isReadOnly || value.education.length <= 1 ? undefined : () => onChange({ ...value, education: value.education.filter((_, position) => position !== index) })}>
            <SelectField label={t("Qualification")} value={education.qualification} onChange={(qualification) => setEducation(index, { qualification })} options={QUALIFICATIONS} isRequired isDisabled={isReadOnly} error={error(`education[${index}].qualification`)} />
            <YearSelect label={t("From Year")} placeholder={t("From year")} value={education.fromYear} onChange={(fromYear) => setEducation(index, { fromYear })} isRequired isDisabled={isReadOnly} error={error(`education[${index}].fromYear`)} />
            <YearSelect label={t("To Year")} placeholder={t("To year")} value={education.toYear} onChange={(toYear) => setEducation(index, { toYear })} isRequired isDisabled={isReadOnly} error={error(`education[${index}].toYear`)} />
            <TextField label={t("Institute")} placeholder="MDU, Rohtak" value={education.institute} onChange={(institute) => setEducation(index, { institute })} isRequired isDisabled={isReadOnly} error={error(`education[${index}].institute`)} />
            <TextField label={t("Grade/Percentage")} placeholder={t("CGPA/GPA/Percentage")} value={education.gradeOrPercentage} onChange={(gradeOrPercentage) => setEducation(index, { gradeOrPercentage })} isRequired isDisabled={isReadOnly} error={error(`education[${index}].gradeOrPercentage`)} />
          </RepeatableBlock>
        ))}
        {!isReadOnly && <button type="button" className="linklike" onClick={() => onChange({ ...value, education: [...value.education, emptyEducation()] })}>+ {t("Add another education")}</button>}

        <h3 className="wizard-subheading">{t("Course Details")}</h3>
        {value.courses.map((course, index) => (
          <RepeatableBlock key={course.id ?? `new-${index}`} title={t("Course {number}", { number: index + 1 })}
            onRemove={isReadOnly ? undefined : () => onChange({ ...value, courses: value.courses.filter((_, position) => position !== index) })}>
            <TextField label={t("Course Name")} placeholder={t("Enter Name")} value={course.courseName} onChange={(courseName) => setCourse(index, { courseName })} isDisabled={isReadOnly} error={error(`courses[${index}].courseName`)} />
            <TextField label={t("Institute")} placeholder={t("Name of Institution")} value={course.institute} onChange={(institute) => setCourse(index, { institute })} isDisabled={isReadOnly} error={error(`courses[${index}].institute`)} />
            <YearSelect label={t("From Year")} placeholder={t("From year")} value={course.fromYear} onChange={(fromYear) => setCourse(index, { fromYear })} isDisabled={isReadOnly} error={error(`courses[${index}].fromYear`)} />
            <YearSelect label={t("To Year")} placeholder={t("To year")} value={course.toYear} onChange={(toYear) => setCourse(index, { toYear })} isDisabled={isReadOnly} error={error(`courses[${index}].toYear`)} />
          </RepeatableBlock>
        ))}
        {!isReadOnly && <button type="button" className="linklike" onClick={() => onChange({ ...value, courses: [...value.courses, emptyCourse()] })}>+ {t("Add another course")}</button>}
      </Accordion>
    </div>
  );
}

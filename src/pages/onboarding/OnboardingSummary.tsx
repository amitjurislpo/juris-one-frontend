import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { MaskedValue } from "@/components/ui/MaskedValue";
import { useT } from "@/lib/i18n/client";
import type { OnboardingSecrets } from "./actions";
import { displayAddress, displayDate, displayValue, displayYesNo, EMPTY_VALUE, nomineeName, nomineePercentage, slotFor, viewForDisplay } from "./summaryFormat";
import type { AttachmentSlot, FamilyMember, Nominee, OnboardingView, StepNumber } from "./types";

type Secrets = Pick<OnboardingSecrets, "bankAccountNumber" | "pan" | "aadhaar">;

const SECTIONS = [
  { id: "summary-personal", label: "Personal Information" },
  { id: "summary-employment", label: "Previous Employment" },
  { id: "summary-accounts", label: "Accounts & Statutory" },
  { id: "summary-family", label: "Family Details" },
  { id: "summary-nominations", label: "Nomination Details" },
] as const;

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="col" style={{ gap: 2, minWidth: 0 }}><span className="muted" style={{ fontSize: 12.5 }}>{label}</span><b style={{ fontWeight: 500, overflowWrap: "anywhere" }}>{children}</b></div>;
}

function Pairs({ children }: { children: React.ReactNode }) {
  return <div className="summary-pairs">{children}</div>;
}

function Card({ id, number, title, step, onEdit, children }: { id?: string; number: number; title: string; step: StepNumber; onEdit?: (step: StepNumber) => void; children: React.ReactNode }) {
  const t = useT();
  return (
    <section id={id} className="card pad" style={{ scrollMarginTop: 80 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{number}. {title}</h3>
        {onEdit && <button type="button" className="icon-btn" onClick={() => onEdit(step)} aria-label={t("Edit {section}", { section: title })}><Icon name="edit" size={16} /></button>}
      </div>
      <div className="col" style={{ gap: 18 }}>{children}</div>
    </section>
  );
}

function Attachments({ slot, attachmentUrl }: { slot: AttachmentSlot | undefined; attachmentUrl: (fileId: string, isDownload: boolean) => string }) {
  const t = useT();
  if (!slot) return null;
  return (
    <div className="col" style={{ gap: 6 }}>
      <span className="muted" style={{ fontSize: 12.5 }}>{slot.title}</span>
      {slot.files.length === 0 && <b style={{ fontWeight: 500 }}>{EMPTY_VALUE}</b>}
      {slot.files.map((file) => (
        <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="paperclip" size={15} />
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={file.fileName}>{file.fileName}</span>
          <a className="icon-btn" href={attachmentUrl(file.id, false)} target="_blank" rel="noreferrer" aria-label={t("View {name}", { name: file.fileName })}><Icon name="eye" size={16} /></a>
          <a className="icon-btn" href={attachmentUrl(file.id, true)} download aria-label={t("Download {name}", { name: file.fileName })}><Icon name="download" size={16} /></a>
        </div>
      ))}
    </div>
  );
}

function NomineeRows({ title, nominees, familyMembers, hasPercentage = true }: { title: string; nominees: Nominee[]; familyMembers: FamilyMember[]; hasPercentage?: boolean }) {
  const t = useT();
  if (!nominees.length) return <Pairs><Pair label={`${title} ${t("Name")}`}>{EMPTY_VALUE}</Pair></Pairs>;
  return <>{nominees.map((nominee, index) => <Pairs key={index}><Pair label={`${title} ${t("Name")}`}>{nomineeName(familyMembers, nominee.familyMemberId)}</Pair>{hasPercentage && <Pair label={`${title} %`}>{nomineePercentage(nominee)}</Pair>}</Pairs>)}</>;
}

/**
 * The seven Information Summary cards with a sticky anchor menu. Used by the employee (with `onEdit`) and read-only by HR (without it).
 * `secrets` holds the full values for the eye toggles; `loadSecrets` fetches them on the first click instead (so the API audits a reveal only when it happens).
 */
export function OnboardingSummary({ view, secrets, loadSecrets, onEdit, attachmentUrl }: {
  view: OnboardingView;
  secrets: Secrets | null;
  loadSecrets?: () => Promise<Secrets>;
  onEdit?: (step: StepNumber) => void;
  attachmentUrl: (fileId: string, isDownload: boolean) => string;
}) {
  const t = useT();
  const { personal, permanentAddress, presentAddress, emergencyContact, education, courses, employments, bank, statutory, familyMembers, nominations, attachmentSlots } = viewForDisplay(view);
  const yes = t("Yes"), no = t("No");
  const attachment = (slotKey: string) => <Attachments slot={slotFor(attachmentSlots, slotKey)} attachmentUrl={attachmentUrl} />;
  const masked = (hasValue: boolean, maskedText: string, field: keyof Secrets) => {
    if (!hasValue) return EMPTY_VALUE;
    const reveal = secrets ? undefined : loadSecrets ? async () => (await loadSecrets())[field] : undefined;
    return <MaskedValue maskedText={maskedText || "••••••••"} revealedText={secrets?.[field]} reveal={reveal} />;
  };
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const isAtEnd = useRef(false);
  const jumpTo = (id: string) => { setActiveId(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  // the menu item of the card being read is highlighted (works in the page and inside the HR window)
  useEffect(() => {
    const cards = SECTIONS.map((section) => document.getElementById(section.id)).filter((card): card is HTMLElement => card !== null);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top);
      if (visible.length > 0 && !isAtEnd.current) setActiveId(visible[0].target.id);
    }, { rootMargin: "-15% 0px -50% 0px" });
    cards.forEach((card) => observer.observe(card));
    // the last card is short: when the scroll reaches the end of the page (or of the window it is in) it is the one being read
    const onScroll = (event: Event) => {
      const scroller = event.target === document ? document.scrollingElement : (event.target as HTMLElement | null);
      if (!scroller) return;
      isAtEnd.current = scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      if (isAtEnd.current) setActiveId(SECTIONS[SECTIONS.length - 1].id);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll, true); };
  }, []);

  return (
    <div className="summary-layout">
      <nav aria-label={t("Information Summary")} className="summary-nav">
        {SECTIONS.map((section) => <button key={section.id} type="button" className={`btn btn-ghost summary-nav-item${section.id === activeId ? " active" : ""}`} aria-current={section.id === activeId ? "true" : undefined} onClick={() => jumpTo(section.id)}>{t(section.label)}</button>)}
      </nav>
      <div className="col" style={{ gap: 16 }}>
        <Card id="summary-personal" number={1} title={t("Personal Information")} step={1} onEdit={onEdit}>
          <Pairs>
            <Pair label={t("Blood Group")}>{displayValue(personal.bloodGroup)}</Pair>
            <Pair label={t("Personal Email")}>{displayValue(personal.personalEmail)}</Pair>
            <Pair label={t("Father's Name")}>{displayValue(personal.fatherName)}</Pair>
            <Pair label={t("Marital Status")}>{displayValue(personal.maritalStatus)}</Pair>
            <Pair label={t("Marriage Date")}>{displayDate(personal.marriageDate)}</Pair>
            <Pair label={t("Spouse Name")}>{displayValue(personal.spouseName)}</Pair>
            <Pair label={t("Country of Origin")}>{displayValue(personal.countryOfOrigin)}</Pair>
            <Pair label={t("Nationality")}>{displayValue(personal.nationality)}</Pair>
            <Pair label={t("International Employee")}>{displayYesNo(personal.isInternationalEmployee, yes, no)}</Pair>
            <Pair label={t("Physically Challenged")}>{displayYesNo(personal.isPhysicallyChallenged, yes, no)}</Pair>
            <Pair label={t("Type of Disability")}>{displayValue(personal.disabilityType)}</Pair>
            <Pair label={t("Gender")}>{displayValue(personal.gender)}</Pair>
            <Pair label={t("Date of Birth")}>{displayDate(personal.dateOfBirth)}</Pair>
            <Pair label={t("Height (cm)")}>{displayValue(personal.heightCm)}</Pair>
            <Pair label={t("Weight (kg)")}>{displayValue(personal.weightKg)}</Pair>
            <Pair label={t("Identification Mark")}>{displayValue(personal.identificationMark)}</Pair>
            <Pair label={t("Religion")}>{displayValue(personal.religion)}</Pair>
            <Pair label={t("Caste")}>{displayValue(personal.caste)}</Pair>
            <Pair label={t("Hobby")}>{displayValue(personal.hobby)}</Pair>
          </Pairs>
          <Pairs>
            <Pair label={t("Emergency Contact Name")}>{displayValue(emergencyContact.name)}</Pair>
            <Pair label={t("Emergency Contact Mobile")}>{displayValue(emergencyContact.mobile)}</Pair>
            <Pair label={t("Emergency Contact Relationship")}>{displayValue(emergencyContact.relationship)}</Pair>
          </Pairs>
        </Card>

        <Card number={2} title={t("Address")} step={1} onEdit={onEdit}>
          <Pairs>
            <Pair label={t("Permanent Address")}>{displayAddress(permanentAddress)}</Pair>
            <Pair label={t("Permanent Address Phone")}>{displayValue(permanentAddress.phone)}</Pair>
          </Pairs>
          {attachment("address_permanent")}
          <Pairs>
            <Pair label={t("Present Address")}>{presentAddress.isSameAsPermanent ? t("Same as permanent address") : displayAddress(presentAddress)}</Pair>
            <Pair label={t("Present Address Phone")}>{displayValue(presentAddress.isSameAsPermanent ? permanentAddress.phone : presentAddress.phone)}</Pair>
          </Pairs>
          {attachment("address_present")}
        </Card>

        <Card number={3} title={t("Qualifications")} step={1} onEdit={onEdit}>
          {education.length === 0 && courses.length === 0 && <b style={{ fontWeight: 500 }}>{EMPTY_VALUE}</b>}
          {education.map((entry, index) => (
            <div key={entry.id ?? index} className="col" style={{ gap: 10 }}>
              <Pairs>
                <Pair label={t("Qualification")}>{displayValue(entry.qualification)}</Pair>
                <Pair label={t("From Year")}>{displayValue(entry.fromYear)}</Pair>
                <Pair label={t("To Year")}>{displayValue(entry.toYear)}</Pair>
                <Pair label={t("Institute")}>{displayValue(entry.institute)}</Pair>
                <Pair label={t("Grade / Percentage")}>{displayValue(entry.gradeOrPercentage)}</Pair>
              </Pairs>
              {entry.id && attachment(`qualification:${entry.id}`)}
            </div>
          ))}
          {courses.map((course, index) => (
            <Pairs key={course.id ?? index}>
              <Pair label={t("Course Name")}>{displayValue(course.courseName)}</Pair>
              <Pair label={t("Institute")}>{displayValue(course.institute)}</Pair>
              <Pair label={t("From Year")}>{displayValue(course.fromYear)}</Pair>
              <Pair label={t("To Year")}>{displayValue(course.toYear)}</Pair>
            </Pairs>
          ))}
        </Card>

        <Card id="summary-employment" number={4} title={t("Previous Employment")} step={2} onEdit={onEdit}>
          {employments.length === 0 && <b style={{ fontWeight: 500 }}>{EMPTY_VALUE}</b>}
          {employments.map((employment, index) => (
            <div key={employment.id ?? index} className="col" style={{ gap: 10 }}>
              <Pairs>
                <Pair label={t("Company Name")}>{displayValue(employment.companyName)}</Pair>
                <Pair label={t("Designation")}>{displayValue(employment.designation)}</Pair>
                <Pair label={t("Last Drawn Salary")}>{displayValue(employment.lastDrawnSalary)}</Pair>
                <Pair label={t("From Date")}>{displayDate(employment.fromDate)}</Pair>
                <Pair label={t("To Date")}>{displayDate(employment.toDate)}</Pair>
                <Pair label={t("Reason for Leaving")}>{displayValue(employment.reasonForLeaving)}</Pair>
                <Pair label={t("Company Address")}>{displayValue(employment.companyAddress)}</Pair>
              </Pairs>
              {employment.id && attachment(`employment:${employment.id}`)}
            </div>
          ))}
        </Card>

        <Card id="summary-accounts" number={5} title={t("Accounts & Statutory")} step={3} onEdit={onEdit}>
          <Pairs>
            <Pair label={t("Country")}>{displayValue(bank.country)}</Pair>
            <Pair label={t("Bank Account Number")}>{masked(bank.hasBankAccountNumber, bank.bankAccountNumber ?? "", "bankAccountNumber")}</Pair>
            <Pair label={t("Bank Code (IFSC)")}>{displayValue(bank.ifsc)}</Pair>
            <Pair label={t("Name as per Bank Account")}>{displayValue(bank.nameAsPerBank)}</Pair>
            <Pair label={t("Account Type")}>{displayValue(bank.accountType)}</Pair>
          </Pairs>
          {attachment("bank")}
          <Pairs>
            <Pair label={t("Previous PF Account Number")}>{displayValue(statutory.previousPfNumber)}</Pair>
            <Pair label={t("UAN")}>{statutory.hasUan ? displayValue(statutory.uan) : EMPTY_VALUE}</Pair>
          </Pairs>
          <Pairs>
            <Pair label={t("PAN")}>{masked(statutory.hasPan, statutory.pan ?? "", "pan")}</Pair>
            <Pair label={t("Name as per PAN")}>{displayValue(statutory.namePerPan)}</Pair>
          </Pairs>
          {attachment("pan")}
          <Pairs>
            <Pair label={t("Aadhaar")}>{masked(statutory.hasAadhaar, statutory.aadhaar ?? "", "aadhaar")}</Pair>
            <Pair label={t("Name as per Aadhaar")}>{displayValue(statutory.namePerAadhaar)}</Pair>
          </Pairs>
          {attachment("aadhaar")}
          <Pairs>
            <Pair label={t("Passport Number")}>{displayValue(statutory.passportNumber)}</Pair>
            <Pair label={t("Name as per Passport")}>{displayValue(statutory.namePerPassport)}</Pair>
            <Pair label={t("Passport Expiry")}>{displayDate(statutory.passportExpiry)}</Pair>
          </Pairs>
          {attachment("passport")}
        </Card>

        <Card id="summary-family" number={6} title={t("Family Details")} step={4} onEdit={onEdit}>
          {familyMembers.length === 0 && <b style={{ fontWeight: 500 }}>{EMPTY_VALUE}</b>}
          {familyMembers.map((member, index) => (
            <div key={member.id ?? index} className="col" style={{ gap: 10 }}>
              <Pairs>
                <Pair label={t("Name")}>{displayValue(member.name)}</Pair>
                <Pair label={t("Relationship")}>{displayValue(member.relationship)}</Pair>
                <Pair label={t("Date of Birth")}>{displayDate(member.dateOfBirth)}</Pair>
                <Pair label={t("Gender")}>{displayValue(member.gender)}</Pair>
                <Pair label={t("Blood Group")}>{displayValue(member.bloodGroup)}</Pair>
                <Pair label={t("Nationality")}>{displayValue(member.nationality)}</Pair>
                <Pair label={t("Minor")}>{displayYesNo(member.isMinor, yes, no)}</Pair>
                <Pair label={t("Mental Illness")}>{displayYesNo(member.hasMentalIllness, yes, no)}</Pair>
              </Pairs>
              {member.guardian && (
                <Pairs>
                  <Pair label={t("Guardian Name")}>{displayValue(member.guardian.name)}</Pair>
                  <Pair label={t("Guardian Relationship")}>{displayValue(member.guardian.relationship)}</Pair>
                  <Pair label={t("Guardian Address")}>{displayAddress({ ...member.guardian, district: "", phone: "" })}</Pair>
                  <Pair label={t("Guardian Mobile")}>{displayValue(member.guardian.mobile)}</Pair>
                  <Pair label={t("Guardian Email")}>{displayValue(member.guardian.email)}</Pair>
                </Pairs>
              )}
            </div>
          ))}
        </Card>

        <Card id="summary-nominations" number={7} title={t("Nomination Details")} step={5} onEdit={onEdit}>
          <NomineeRows title="EPF" nominees={nominations.epf} familyMembers={familyMembers} />
          <NomineeRows title="EPS" nominees={nominations.eps ? [{ familyMemberId: nominations.eps.familyMemberId, percentage: "" }] : []} familyMembers={familyMembers} hasPercentage={false} />
          <NomineeRows title="ESI" nominees={nominations.esi ? [{ familyMemberId: nominations.esi.familyMemberId, percentage: "" }] : []} familyMembers={familyMembers} hasPercentage={false} />
          <NomineeRows title={t("Gratuity")} nominees={nominations.gratuity} familyMembers={familyMembers} />
        </Card>
      </div>
    </div>
  );
}

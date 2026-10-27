import { formatDayMonthYear } from "@/lib/format";
import { toFormText } from "./draft";
import type { Address, AttachmentSlot, FamilyMember, Nominee, OnboardingView } from "./types";

/** Summary shows "-" for anything empty. */
export const EMPTY_VALUE = "-";

export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  const text = String(value).trim();
  return text === "" ? EMPTY_VALUE : text;
}

export const displayDate = (isoDate: string | null | undefined): string => (isoDate && /^\d{4}-\d{2}-\d{2}/.test(isoDate) ? formatDayMonthYear(isoDate.slice(0, 10)) : EMPTY_VALUE);

/** Yes / No / "-" (null = not answered). Takes the translated words so the helper stays pure. */
export const displayYesNo = (value: boolean | null | undefined, yes: string, no: string): string => (value === null || value === undefined ? EMPTY_VALUE : value ? yes : no);

export function displayAddress(address: Address): string {
  const lines = [address.line1, address.line2, address.line3, [address.city, address.district].filter(Boolean).join(", "), [address.state, address.pin].filter(Boolean).join(" - "), address.country]
    .map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines.join(", ") : EMPTY_VALUE;
}

/** The name of the nominated family member, or "-" when the member no longer exists. */
export const nomineeName = (familyMembers: FamilyMember[], familyMemberId: string | null | undefined): string => displayValue(familyMembers.find((member) => member.id === familyMemberId)?.name);

export const nomineePercentage = (nominee: Nominee): string => (nominee.percentage.trim() === "" ? EMPTY_VALUE : `${nominee.percentage.trim()}%`);

export const slotFor = (slots: AttachmentSlot[], slotKey: string): AttachmentSlot | undefined => slots.find((slot) => slot.slotKey === slotKey);

/** "AMIT JASPAL" -> "AMIT" (upper case, first word). */
export const firstNameUpper = (fullName: string): string => (fullName.trim().split(/\s+/)[0] ?? "").toUpperCase();

/** The API sends `null` for empty text and numbers for numeric fields; the Summary works with strings only, as the forms do. */
export const viewForDisplay = (view: OnboardingView): OnboardingView => ({
  ...view,
  personal: toFormText(view.personal),
  permanentAddress: toFormText(view.permanentAddress),
  presentAddress: toFormText(view.presentAddress),
  emergencyContact: toFormText(view.emergencyContact),
  education: view.education.map(toFormText),
  courses: view.courses.map(toFormText),
  employments: view.employments.map(toFormText),
  bank: toFormText(view.bank),
  statutory: toFormText(view.statutory),
  familyMembers: view.familyMembers.map((member) => ({ ...toFormText(member), guardian: member.guardian ? toFormText(member.guardian) : null })),
  nominations: { ...view.nominations, epf: view.nominations.epf.map(toFormText), gratuity: view.nominations.gratuity.map(toFormText) },
});

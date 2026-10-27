import type { FamilyMember, FieldErrors, Nominee, Nominations } from "../types";

export const SINGLE_NOMINEE_MESSAGE = "Nomination % must be 100 in case of single nominee.";
export const TOTAL_MESSAGE = "Nomination % of all nominees must add up to 100.";

export function emptyNominations(): Nominations {
  return { epf: [], eps: null, esi: null, gratuity: [] };
}

/** "Name (Relationship)" as shown in the nominee dropdown. */
export function familyMemberLabel(member: FamilyMember): string {
  return member.relationship ? `${member.name} (${member.relationship})` : member.name;
}

/** A nominee block counts as used once a member is picked or a percentage typed; an untouched block is ignored (not validated, not sent). */
export function isNomineeUsed(nominee: Nominee): boolean {
  return nominee.familyMemberId !== "" || nominee.percentage.trim() !== "";
}

function validateShares(block: "epf" | "gratuity", allNominees: Nominee[], errors: FieldErrors): void {
  const seen = new Set<string>();
  const nominees = allNominees.filter(isNomineeUsed);
  allNominees.forEach((nominee, index) => {
    if (!isNomineeUsed(nominee)) return;
    const key = (field: string) => `nominations.${block}[${index}].${field}`;
    if (!nominee.familyMemberId) errors[key("familyMemberId")] = "Select a family member";
    else if (seen.has(nominee.familyMemberId)) errors[key("familyMemberId")] = "This family member is already nominated here";
    else seen.add(nominee.familyMemberId);
    const percentage = Number(nominee.percentage);
    if (!nominee.percentage.trim()) errors[key("percentage")] = "Nomination % is mandatory";
    else if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) errors[key("percentage")] = "Enter a whole number from 1 to 100";
  });
  const firstUsedIndex = allNominees.findIndex(isNomineeUsed);
  if (nominees.length === 0 || allNominees.some((_, index) => errors[`nominations.${block}[${index}].percentage`])) return;
  const total = nominees.reduce((sum, nominee) => sum + Number(nominee.percentage), 0);
  if (total !== 100) errors[`nominations.${block}[${firstUsedIndex}].percentage`] = nominees.length === 1 ? SINGLE_NOMINEE_MESSAGE : TOTAL_MESSAGE;
}

/** Errors keyed like "nominations.epf[1].percentage"; a block may stay empty. */
export function validateNominations(nominations: Nominations): FieldErrors {
  const errors: FieldErrors = {};
  validateShares("epf", nominations.epf, errors);
  validateShares("gratuity", nominations.gratuity, errors);
  if (nominations.eps && !nominations.eps.familyMemberId) errors["nominations.eps.familyMemberId"] = "Select a family member";
  if (nominations.esi && !nominations.esi.familyMemberId) errors["nominations.esi.familyMemberId"] = "Select a family member";
  return errors;
}

/** True when any error belongs to the given block ("epf", "eps", "esi", "gratuity"). */
export function hasBlockErrors(errors: FieldErrors, block: string): boolean {
  return Object.keys(errors).some((key) => key.startsWith(`nominations.${block}[`) || key.startsWith(`nominations.${block}.`));
}

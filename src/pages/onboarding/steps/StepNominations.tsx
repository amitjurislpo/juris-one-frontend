import { Icon } from "@/components/Icon";
import { RepeatableBlock } from "@/components/ui/RepeatableBlock";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useT } from "@/lib/i18n/client";
import { emptyNominee } from "../draft";
import type { FamilyMember, FieldErrors, Nominations, Nominee } from "../types";
import { familyMemberLabel, hasBlockErrors } from "../validation/nominations";

type ShareBlock = "epf" | "gratuity";

export function StepNominations({ value, onChange, errors, isReadOnly, familyMembers, onGoToFamilyDetails }: {
  value: Nominations; onChange: (next: Nominations) => void; errors: FieldErrors; isReadOnly: boolean; familyMembers: FamilyMember[];
  /** Optional: makes the "no family members" hint a link back to Step 4. */
  onGoToFamilyDetails?: () => void;
}) {
  const t = useT();
  const savedMembers = familyMembers.filter((member): member is FamilyMember & { id: string } => member.id !== null);
  const options = savedMembers.map((member) => ({ value: member.id, label: familyMemberLabel(member) }));
  const error = (path: string) => { const message = errors[path]; return message ? t(message) : undefined; };
  const warning = (block: string) => hasBlockErrors(errors, block) && <p className="err" role="alert">{t("Some information is missing or invalid")}</p>;
  const tooltip = t("You can nominate more than one family member and add percentage of share for your EPF, EPS, ESI, Gratuity accounts.");

  const updateShares = (block: ShareBlock, index: number, changes: Partial<Nominee>) =>
    onChange({ ...value, [block]: value[block].map((nominee, position) => (position === index ? { ...nominee, ...changes } : nominee)) });

  const sharesBlock = (block: ShareBlock, title: string) => (
    <section className="card pad stack" aria-label={title}>
      <h4>{title}</h4>
      {warning(block)}
      {value[block].map((nominee, index) => (
        <RepeatableBlock key={`${block}-${index}`} title={t("Nominee {number}", { number: index + 1 })}
          onRemove={isReadOnly ? undefined : () => onChange({ ...value, [block]: value[block].filter((_, position) => position !== index) })}>
          <SelectField label={t("Name")} isRequired isDisabled={isReadOnly} value={nominee.familyMemberId} options={options} error={error(`nominations.${block}[${index}].familyMemberId`)} onChange={(next) => updateShares(block, index, { familyMemberId: next })} />
          <TextField label={t("Nomination %")} isRequired isDisabled={isReadOnly} value={nominee.percentage} placeholder={t("Eg. 50")} inputMode="numeric" maxLength={3} error={error(`nominations.${block}[${index}].percentage`)} onChange={(next) => updateShares(block, index, { percentage: next.replace(/\D/g, "") })} />
        </RepeatableBlock>
      ))}
      {!isReadOnly && savedMembers.length > 0 && (
        <button type="button" className="linklike" onClick={() => onChange({ ...value, [block]: [...value[block], emptyNominee()] })}>
          <Icon name="plus" size={14} /> {t("Add another member")}
        </button>
      )}
    </section>
  );

  const singleBlock = (block: "eps" | "esi", title: string) => (
    <section className="card pad stack" aria-label={title}>
      <h4>{title}</h4>
      {warning(block)}
      <RepeatableBlock title={t("Nominee")}>
        <SelectField label={t("Name")} isDisabled={isReadOnly} value={value[block]?.familyMemberId ?? ""} options={options} error={error(`nominations.${block}.familyMemberId`)}
          onChange={(next) => onChange({ ...value, [block]: next ? { familyMemberId: next } : null })} />
      </RepeatableBlock>
    </section>
  );

  return (
    <div className="stack">
      <h3>{t("Nominations")} <span title={tooltip} aria-label={tooltip}><Icon name="info" size={16} /></span></h3>
      {savedMembers.length === 0 && (
        <p className="notice warn notice-row">
          {t("Add and save your family members first, then nominate them here.")}{" "}
          {onGoToFamilyDetails && <button type="button" className="linklike" onClick={onGoToFamilyDetails}>{t("Go to Family Details")}</button>}
        </p>
      )}
      {sharesBlock("epf", t("EPF Nomination"))}
      {singleBlock("eps", t("EPS Nomination"))}
      {singleBlock("esi", t("ESI Nomination"))}
      {sharesBlock("gratuity", t("Gratuity Nomination"))}
    </div>
  );
}

import { DateField } from "@/components/ui/DateField";
import { RepeatableBlock } from "@/components/ui/RepeatableBlock";
import { TextField } from "@/components/ui/TextField";
import { useT } from "@/lib/i18n/client";
import { emptyEmployment } from "../draft";
import type { Employment, FieldErrors } from "../types";
import { errorFor } from "../validation/common";

/** Step 2: previous employers. Nothing is starred; a block that is started needs company name, from date and to date. */
export function StepEmployment({ value, onChange, errors, isReadOnly }: { value: Employment[]; onChange: (next: Employment[]) => void; errors: FieldErrors; isReadOnly: boolean }) {
  const t = useT();
  const update = (index: number, changes: Partial<Employment>) => onChange(value.map((employment, position) => (position === index ? { ...employment, ...changes } : employment)));
  return (
    <div>
      {value.length === 0 && <p className="muted">{t("Starting your career? You can skip this step.")}</p>}
      {value.map((employment, index) => {
        const error = (field: string) => errorFor(errors, `employments[${index}].${field}`, t);
        return (
          <RepeatableBlock key={employment.id ?? `new-${index}`} title={t("Employment {number}", { number: index + 1 })}
            onRemove={isReadOnly ? undefined : () => onChange(value.filter((_, position) => position !== index))}>
            <TextField label={t("Company Name")} value={employment.companyName} onChange={(companyName) => update(index, { companyName })} isDisabled={isReadOnly} error={error("companyName")} />
            <TextField label={t("Designation")} value={employment.designation} onChange={(designation) => update(index, { designation })} isDisabled={isReadOnly} error={error("designation")} />
            <TextField label={t("Last Drawn Salary")} placeholder={t("Enter Last Drawn Salary")} type="number" inputMode="decimal" value={employment.lastDrawnSalary} onChange={(lastDrawnSalary) => update(index, { lastDrawnSalary })} isDisabled={isReadOnly} error={error("lastDrawnSalary")} />
            <DateField label={t("From Date")} value={employment.fromDate} onChange={(fromDate) => update(index, { fromDate })} isDisabled={isReadOnly} error={error("fromDate")} />
            <DateField label={t("To Date")} value={employment.toDate} minDate={employment.fromDate || undefined} onChange={(toDate) => update(index, { toDate })} isDisabled={isReadOnly} error={error("toDate")} />
            <TextField label={t("Reason for Leaving")} placeholder={t("Enter Reason")} isMultiline value={employment.reasonForLeaving} onChange={(reasonForLeaving) => update(index, { reasonForLeaving })} isDisabled={isReadOnly} error={error("reasonForLeaving")} />
            <TextField label={t("Company Address")} isMultiline value={employment.companyAddress} onChange={(companyAddress) => update(index, { companyAddress })} isDisabled={isReadOnly} error={error("companyAddress")} />
          </RepeatableBlock>
        );
      })}
      {!isReadOnly && <button type="button" className="linklike" onClick={() => onChange([...value, emptyEmployment()])}>+ {t("Add another Employment")}</button>}
    </div>
  );
}

import { useT } from "@/lib/i18n/client";
import { FieldFrame } from "./FieldFrame";

export type SelectOption = string | { value: string; label: string };

export function SelectField({ label, value, onChange, options, isRequired, isDisabled, error, placeholder }: {
  label: string; value: string; onChange: (next: string) => void; options: SelectOption[];
  isRequired?: boolean; isDisabled?: boolean; error?: string; placeholder?: string;
}) {
  const t = useT();
  return (
    <FieldFrame label={label} isRequired={isRequired} error={error}>
      {({ controlId, describedBy, isInvalid }) => (
        <select id={controlId} value={value} disabled={isDisabled} aria-required={isRequired} aria-invalid={isInvalid} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder ?? t("Select")}</option>
          {options.map((option) => {
            const optionValue = typeof option === "string" ? option : option.value;
            const optionLabel = typeof option === "string" ? option : option.label;
            return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
          })}
        </select>
      )}
    </FieldFrame>
  );
}

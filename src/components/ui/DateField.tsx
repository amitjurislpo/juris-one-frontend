import { FieldFrame } from "./FieldFrame";

/** A date picker; the value is an ISO date (`2019-03-04`) or an empty string. */
export function DateField({ label, value, onChange, isRequired, isDisabled, error, placeholder, minDate, maxDate }: {
  label: string; value: string; onChange: (next: string) => void;
  isRequired?: boolean; isDisabled?: boolean; error?: string; placeholder?: string; minDate?: string; maxDate?: string;
}) {
  return (
    <FieldFrame label={label} isRequired={isRequired} error={error}>
      {({ controlId, describedBy, isInvalid }) => (
        <input id={controlId} type="date" value={value} min={minDate} max={maxDate} placeholder={placeholder} disabled={isDisabled}
          aria-required={isRequired} aria-invalid={isInvalid} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
      )}
    </FieldFrame>
  );
}

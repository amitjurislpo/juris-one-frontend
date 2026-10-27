import { FieldFrame } from "./FieldFrame";

export function TextField({ label, value, onChange, isRequired, isDisabled, error, placeholder, hint, type = "text", maxLength, inputMode, isMultiline, autoComplete }: {
  label: string; value: string; onChange: (next: string) => void;
  isRequired?: boolean; isDisabled?: boolean; error?: string; placeholder?: string; hint?: string;
  type?: "text" | "email" | "number" | "password" | "tel";
  maxLength?: number; inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
  /** Multi-line input (spans the full row). */
  isMultiline?: boolean;
  autoComplete?: string;
}) {
  return (
    <FieldFrame label={label} isRequired={isRequired} error={error} hint={hint} isWide={isMultiline}>
      {({ controlId, describedBy, isInvalid }) => isMultiline ? (
        <textarea id={controlId} value={value} placeholder={placeholder} disabled={isDisabled} maxLength={maxLength}
          aria-required={isRequired} aria-invalid={isInvalid} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input id={controlId} type={type} value={value} placeholder={placeholder} disabled={isDisabled} maxLength={maxLength} inputMode={inputMode}
          autoComplete={autoComplete} aria-required={isRequired} aria-invalid={isInvalid} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
      )}
    </FieldFrame>
  );
}

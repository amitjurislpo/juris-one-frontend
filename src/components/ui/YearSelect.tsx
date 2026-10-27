import { SelectField } from "./SelectField";

const EARLIEST_YEAR = 1950;

/** Years from next year down to 1950, as the spec asks (newest first). */
function yearOptions(): string[] {
  const years: string[] = [];
  for (let year = new Date().getFullYear() + 1; year >= EARLIEST_YEAR; year--) years.push(String(year));
  return years;
}

export function YearSelect({ label, value, onChange, isRequired, isDisabled, error, placeholder }: {
  label: string; value: string; onChange: (next: string) => void;
  isRequired?: boolean; isDisabled?: boolean; error?: string; placeholder?: string;
}) {
  return <SelectField label={label} value={value} onChange={onChange} options={yearOptions()} isRequired={isRequired} isDisabled={isDisabled} error={error} placeholder={placeholder} />;
}

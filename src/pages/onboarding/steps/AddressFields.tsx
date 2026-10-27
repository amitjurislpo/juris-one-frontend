import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useT } from "@/lib/i18n/client";
import { COUNTRIES, DEFAULT_COUNTRY, INDIAN_STATES } from "../options";
import type { Address, FieldErrors } from "../types";
import { digitsOnly } from "../validation/statutory";
import { errorFor } from "../validation/common";

/** The nine address fields (permanent and present share them). `path` is the error-key prefix ("permanentAddress"). */
export function AddressFields({ path, value, onChange, errors, isDisabled }: {
  path: string; value: Address; onChange: (next: Address) => void; errors: FieldErrors; isDisabled: boolean;
}) {
  const t = useT();
  const error = (field: string) => errorFor(errors, `${path}.${field}`, t);
  const set = (changes: Partial<Address>) => onChange({ ...value, ...changes });
  const stateOptions = value.country === DEFAULT_COUNTRY ? INDIAN_STATES : [];
  return (
    <div className="form-grid">
      <TextField label={t("Address")} value={value.line1} onChange={(line1) => set({ line1 })} isRequired isDisabled={isDisabled} error={error("line1")} />
      <TextField label={t("Address Line 2")} value={value.line2} onChange={(line2) => set({ line2 })} isDisabled={isDisabled} error={error("line2")} />
      <TextField label={t("Address Line 3")} value={value.line3} onChange={(line3) => set({ line3 })} isDisabled={isDisabled} error={error("line3")} />
      <TextField label={t("City")} value={value.city} onChange={(city) => set({ city })} isRequired isDisabled={isDisabled} error={error("city")} />
      <TextField label={t("District")} value={value.district} onChange={(district) => set({ district })} isDisabled={isDisabled} error={error("district")} />
      {stateOptions.length > 0
        ? <SelectField label={t("State")} value={value.state} onChange={(state) => set({ state })} options={stateOptions} isRequired isDisabled={isDisabled} error={error("state")} />
        : <TextField label={t("State")} value={value.state} onChange={(state) => set({ state })} isRequired isDisabled={isDisabled} error={error("state")} />}
      <TextField label={t("Pin")} value={value.pin} onChange={(pin) => set({ pin: digitsOnly(pin, 6) })} isRequired isDisabled={isDisabled} error={error("pin")} inputMode="numeric" maxLength={6} />
      <SelectField label={t("Country")} value={value.country} onChange={(country) => set({ country, state: country === value.country ? value.state : "" })} options={COUNTRIES} isRequired isDisabled={isDisabled} error={error("country")} />
      <TextField label={t("Phone Number")} value={value.phone} onChange={(phone) => set({ phone: digitsOnly(phone, 10) })} isRequired isDisabled={isDisabled} error={error("phone")} inputMode="tel" maxLength={10} />
    </div>
  );
}

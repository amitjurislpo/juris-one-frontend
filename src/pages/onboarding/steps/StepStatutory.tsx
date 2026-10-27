import { DateField } from "@/components/ui/DateField";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useT } from "@/lib/i18n/client";
import type { StatutoryStepValue } from "../draft";
import { ACCOUNT_TYPES, COUNTRIES } from "../options";
import type { FieldErrors } from "../types";
import { errorFor } from "../validation/common";
import { digitsOnly } from "../validation/statutory";

/** The saved values of the masked fields ("XXXXXXXX1234"), shown as placeholders until the employee types a new value. */
export interface MaskedStatutoryValues { bankAccountNumber: string; uan: string; pan: string; aadhaar: string }


/** Step 3 (Identifications): bank account, PF, PAN, Aadhaar and passport. */
export function StepStatutory({ value, onChange, errors, isReadOnly, masked }: {
  value: StatutoryStepValue; onChange: (next: StatutoryStepValue) => void; errors: FieldErrors; isReadOnly: boolean; masked: MaskedStatutoryValues;
}) {
  const t = useT();
  const { bank, statutory } = value;
  const error = (path: string) => errorFor(errors, path, t);
  const setBank = (changes: Partial<StatutoryStepValue["bank"]>) => onChange({ ...value, bank: { ...bank, ...changes } });
  const setStatutory = (changes: Partial<StatutoryStepValue["statutory"]>) => onChange({ ...value, statutory: { ...statutory, ...changes } });
  const keepSaved = t("Saved. Type a new value to replace it.");

  /** A masked field: `null` = keep the saved value (shown as the placeholder); typing replaces it, clearing it goes back to the saved one. */
  const maskedProps = (current: string | null, hasSaved: boolean, savedMask: string, example?: string) => ({
    value: current ?? "",
    placeholder: current === null && hasSaved ? savedMask : example,
    hint: current === null && hasSaved ? keepSaved : undefined,
  });
  const orSaved = (next: string, hasSaved: boolean): string | null => (next === "" && hasSaved ? null : next);


  return (
    <div>
      <section className="card pad wizard-section">
        <h3>{t("Bank Account Details")}</h3>
        <div className="form-grid">
          <SelectField label={t("Country")} value={bank.country} onChange={(country) => setBank({ country })} options={COUNTRIES} isRequired isDisabled={isReadOnly} error={error("bank.country")} />
          <TextField label={t("Bank Account Number")} type="password" inputMode="numeric" maxLength={18} autoComplete="off" isRequired isDisabled={isReadOnly} error={error("bank.bankAccountNumber")}
            {...maskedProps(bank.bankAccountNumber, bank.hasBankAccountNumber, masked.bankAccountNumber)}
            onChange={(next) => onChange({ ...value, bank: { ...bank, bankAccountNumber: orSaved(digitsOnly(next, 18), bank.hasBankAccountNumber) }, confirmBankAccountNumber: "" })} />
          <TextField label={t("Confirm Bank Account Number")} type="password" inputMode="numeric" maxLength={18} autoComplete="off" placeholder={t("Enter Account Number")}
            value={value.confirmBankAccountNumber} onChange={(next) => onChange({ ...value, confirmBankAccountNumber: digitsOnly(next, 18) })}
            isRequired={bank.bankAccountNumber !== null} isDisabled={isReadOnly || bank.bankAccountNumber === null} error={error("confirmBankAccountNumber")} />
          <TextField label={t("Bank Code")} placeholder="ICIC0000571" maxLength={11} value={bank.ifsc} isRequired isDisabled={isReadOnly} error={error("bank.ifsc")}
              onChange={(next) => setBank({ ifsc: next.toUpperCase().replace(/[^A-Z0-9]/g, ""), bankName: "", branch: "", branchAddress: "" })} />
          <TextField label={t("Name as per Bank Account")} value={bank.nameAsPerBank} onChange={(nameAsPerBank) => setBank({ nameAsPerBank })} isRequired isDisabled={isReadOnly} error={error("bank.nameAsPerBank")} />
          <SelectField label={t("Account Type")} value={bank.accountType} onChange={(accountType) => setBank({ accountType })} options={ACCOUNT_TYPES.map((type) => ({ value: type, label: t(type) }))} isRequired isDisabled={isReadOnly} error={error("bank.accountType")} />
        </div>
      </section>

      <section className="card pad wizard-section">
        <h3>{t("PF Account Details")}</h3>
        <div className="form-grid">
          <TextField label={t("Previous PF Account Number")} placeholder="HR/FBD/0003256/000/0000125" value={statutory.previousPfNumber} onChange={(previousPfNumber) => setStatutory({ previousPfNumber })} isDisabled={isReadOnly} error={error("statutory.previousPfNumber")} />
          <TextField label={t("UAN")} inputMode="numeric" maxLength={12} isDisabled={isReadOnly} error={error("statutory.uan")}
            {...maskedProps(statutory.uan, statutory.hasUan, masked.uan)} onChange={(next) => setStatutory({ uan: orSaved(digitsOnly(next, 12), statutory.hasUan) })} />
        </div>
      </section>

      <section className="card pad wizard-section">
        <h3>{t("Permanent Account Number (PAN)")}</h3>
        <div className="form-grid">
          <TextField label={t("PAN Number")} maxLength={10} autoComplete="off" isRequired isDisabled={isReadOnly} error={error("statutory.pan")}
            {...maskedProps(statutory.pan, statutory.hasPan, masked.pan, "ABCDE1234F")} onChange={(next) => setStatutory({ pan: orSaved(next.toUpperCase().replace(/[^A-Z0-9]/g, ""), statutory.hasPan) })} />
          <TextField label={t("Name in PAN")} value={statutory.namePerPan} onChange={(namePerPan) => setStatutory({ namePerPan })} isRequired isDisabled={isReadOnly} error={error("statutory.namePerPan")} />
        </div>
      </section>

      <section className="card pad wizard-section">
        <h3>{t("Aadhaar")}</h3>
        <div className="form-grid">
          <TextField label={t("Aadhaar Number")} inputMode="numeric" maxLength={12} autoComplete="off" isRequired isDisabled={isReadOnly} error={error("statutory.aadhaar")}
            {...maskedProps(statutory.aadhaar, statutory.hasAadhaar, masked.aadhaar)} onChange={(next) => setStatutory({ aadhaar: orSaved(digitsOnly(next, 12), statutory.hasAadhaar) })} />
          <TextField label={t("Name in Aadhaar")} value={statutory.namePerAadhaar} onChange={(namePerAadhaar) => setStatutory({ namePerAadhaar })} isRequired isDisabled={isReadOnly} error={error("statutory.namePerAadhaar")} />
        </div>
      </section>

      <section className="card pad wizard-section">
        <h3>{t("Passport")}</h3>
        <div className="form-grid">
          <TextField label={t("Passport Number")} value={statutory.passportNumber} onChange={(passportNumber) => setStatutory({ passportNumber: passportNumber.toUpperCase() })} isDisabled={isReadOnly} error={error("statutory.passportNumber")} />
          <TextField label={t("Name in Passport")} value={statutory.namePerPassport} onChange={(namePerPassport) => setStatutory({ namePerPassport })} isDisabled={isReadOnly} error={error("statutory.namePerPassport")} />
          <DateField label={t("Expiry Date")} value={statutory.passportExpiry} onChange={(passportExpiry) => setStatutory({ passportExpiry })} isRequired={statutory.passportNumber.trim() !== ""} isDisabled={isReadOnly} error={error("statutory.passportExpiry")} />
        </div>
      </section>
    </div>
  );
}

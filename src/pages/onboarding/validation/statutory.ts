import type { StatutoryStepValue } from "../draft";
import type { FieldErrors } from "../types";
import { checkPattern, isBlank, MANDATORY_MESSAGE, requirePattern, requireText } from "./common";

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const TWELVE_DIGITS_PATTERN = /^[0-9]{12}$/;
const ACCOUNT_NUMBER_PATTERN = /^[0-9]{9,18}$/;
export const MISMATCH_MESSAGE = "Account numbers do not match";

/** Step 3. A masked field that is still `null` is the stored value, kept as is. */
export function validateStatutoryStep(value: StatutoryStepValue): FieldErrors {
  const errors: FieldErrors = {};
  const { bank, statutory } = value;
  requireText(errors, "bank.country", bank.country);
  if (bank.bankAccountNumber !== null) {
    requirePattern(errors, "bank.bankAccountNumber", bank.bankAccountNumber, ACCOUNT_NUMBER_PATTERN, "Enter 9 to 18 digits");
    if (isBlank(value.confirmBankAccountNumber)) errors.confirmBankAccountNumber = MANDATORY_MESSAGE;
    else if (value.confirmBankAccountNumber !== bank.bankAccountNumber) errors.confirmBankAccountNumber = MISMATCH_MESSAGE;
  }
  requirePattern(errors, "bank.ifsc", bank.ifsc.toUpperCase(), IFSC_PATTERN, "Enter a valid bank code, e.g. ICIC0000571");
  requireText(errors, "bank.nameAsPerBank", bank.nameAsPerBank);
  requireText(errors, "bank.accountType", bank.accountType);

  checkPattern(errors, "statutory.uan", statutory.uan, TWELVE_DIGITS_PATTERN, "Enter a 12-digit number");
  if (statutory.pan !== null) requirePattern(errors, "statutory.pan", statutory.pan.toUpperCase(), PAN_PATTERN, "Enter a valid PAN, e.g. ABCDE1234F");
  requireText(errors, "statutory.namePerPan", statutory.namePerPan);
  if (statutory.aadhaar !== null) requirePattern(errors, "statutory.aadhaar", statutory.aadhaar, TWELVE_DIGITS_PATTERN, "Enter a 12-digit number");
  requireText(errors, "statutory.namePerAadhaar", statutory.namePerAadhaar);
  if (!isBlank(statutory.passportNumber)) requireText(errors, "statutory.passportExpiry", statutory.passportExpiry);
  return errors;
}

/** Digits only, at most `maxLength`. */
export const digitsOnly = (text: string, maxLength: number): string => text.replace(/\D/g, "").slice(0, maxLength);

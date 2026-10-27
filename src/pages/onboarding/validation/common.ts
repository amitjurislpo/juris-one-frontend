import type { FieldErrors } from "../types";

export const MANDATORY_MESSAGE = "This field is mandatory";
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isBlank = (text: string | null | undefined): boolean => !text || text.trim() === "";

/** Adds the mandatory message under `key` when the text is blank. */
export function requireText(errors: FieldErrors, key: string, text: string | null | undefined): void {
  if (isBlank(text)) errors[key] = MANDATORY_MESSAGE;
}

/** Mandatory text that must also match `pattern`. */
export function requirePattern(errors: FieldErrors, key: string, text: string | null | undefined, pattern: RegExp, message: string): void {
  if (isBlank(text)) errors[key] = MANDATORY_MESSAGE;
  else if (!pattern.test(text!.trim())) errors[key] = message;
}

/** Like requirePattern, but blank is fine. */
export function checkPattern(errors: FieldErrors, key: string, text: string | null | undefined, pattern: RegExp, message: string): void {
  if (!isBlank(text) && !pattern.test(text!.trim())) errors[key] = message;
}

/** ISO date of today (local time), the upper limit for dates of birth. */
export function todayIso(today: Date = new Date()): string {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

/** True when any error key is, or lies under, one of the prefixes (used to flag a section or a step). */
export function hasErrorUnder(errors: FieldErrors, ...prefixes: string[]): boolean {
  return Object.keys(errors).some((key) => prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}.`) || key.startsWith(`${prefix}[`)));
}

/** The translated error text of the field at `path`, or undefined. Messages are English translation keys (server messages fall back to English). */
export function errorFor(errors: FieldErrors, path: string, translate: (text: string) => string): string | undefined {
  const message = errors[path];
  return message ? translate(message) : undefined;
}

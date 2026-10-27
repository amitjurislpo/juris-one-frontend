import type { Employment, FieldErrors } from "../types";
import { isBlank, requireText } from "./common";

/** A block counts as used as soon as any field has text. */
export function isEmploymentUsed(employment: Employment): boolean {
  return [employment.companyName, employment.designation, employment.lastDrawnSalary, employment.fromDate, employment.toDate, employment.reasonForLeaving, employment.companyAddress].some((text) => !isBlank(text));
}

/** Step 2: nothing is starred (freshers skip it), but a used block needs company name, from date and to date, and to >= from. */
export function validateEmployments(employments: Employment[]): FieldErrors {
  const errors: FieldErrors = {};
  employments.forEach((employment, index) => {
    if (!isEmploymentUsed(employment)) return;
    const key = (field: string) => `employments[${index}].${field}`;
    requireText(errors, key("companyName"), employment.companyName);
    requireText(errors, key("fromDate"), employment.fromDate);
    requireText(errors, key("toDate"), employment.toDate);
    if (!isBlank(employment.fromDate) && !isBlank(employment.toDate) && employment.toDate < employment.fromDate) errors[key("toDate")] = "To date cannot be before from date";
    if (!isBlank(employment.lastDrawnSalary) && !/^\d+(\.\d{1,2})?$/.test(employment.lastDrawnSalary.trim())) errors[key("lastDrawnSalary")] = "Enter a number";
  });
  return errors;
}

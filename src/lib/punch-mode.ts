/** How attendance is recorded: on the web by the person (MANUAL) or by a punch machine (MACHINE). A business may also leave it to each employee. */
export const BUSINESS_PUNCH_MODES = ["MANUAL", "MACHINE", "PER_EMPLOYEE"] as const;
export type BusinessPunchMode = (typeof BUSINESS_PUNCH_MODES)[number];
export type PunchMode = "MANUAL" | "MACHINE";

/** English labels (the keys of the Hindi translations). */
export const BUSINESS_PUNCH_MODE_LABELS: Record<BusinessPunchMode, string> = {
  MANUAL: "Web check-in / check-out (manual)",
  MACHINE: "Punch machine",
  PER_EMPLOYEE: "Choose per employee",
};
export const EMPLOYEE_PUNCH_MODE_LABELS: Record<PunchMode, string> = { MANUAL: "Web (manual)", MACHINE: "Punch machine" };

/** A business setting from the API as one of the known modes (an unknown or missing value is MANUAL). */
export function toBusinessPunchMode(value: string | null | undefined): BusinessPunchMode {
  return (BUSINESS_PUNCH_MODES as readonly string[]).includes(value ?? "") ? (value as BusinessPunchMode) : "MANUAL";
}

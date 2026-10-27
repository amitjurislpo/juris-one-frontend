/** Onboarding statuses as HR sees them (references/ONBOARDING_WIZARD_API.md, v2) and the pure helpers around them. */

export type HireStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";

/** The English label of a status (the translation key); undefined for NOT_REQUIRED or anything unknown. */
const STATUS_LABEL: Record<HireStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted - needs review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
};

const STATUS_CHIP: Record<HireStatus, string> = { NOT_STARTED: "neutral", IN_PROGRESS: "warn", SUBMITTED: "info", CHANGES_REQUESTED: "bad", APPROVED: "ok" };

export const HIRE_STATUSES = Object.keys(STATUS_LABEL) as HireStatus[];

const isHireStatus = (status: string | null | undefined): status is HireStatus => !!status && status in STATUS_LABEL;

export const hireStatusLabel = (status: string | null | undefined): string | undefined => (isHireStatus(status) ? STATUS_LABEL[status] : undefined);

export const hireStatusChip = (status: string | null | undefined): string => (isHireStatus(status) ? STATUS_CHIP[status] : "neutral");

/** HR may fill or edit the wizard on the employee's behalf until it is approved, except while it waits for HR's own decision. */
export const canHrEdit = (status: string): boolean => status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "CHANGES_REQUESTED";

/** The list's action link: "Review" for a submitted onboarding, "View" once approved, otherwise HR fills it in. */
export function hireActionLabel(status: string): string {
  if (status === "SUBMITTED") return "Review";
  if (status === "APPROVED") return "View";
  return "Fill details";
}

/** One row of `GET /api/onboardings`. */
export interface HireRow {
  employeeId: string;
  name: string;
  employeeCode: string;
  email: string;
  designation: string | null;
  department: string | null;
  status: string;
  submittedAt: string | null;
  currentStep: number | null;
}

export interface HiresPage { rows: HireRow[]; total: number; page: number; take: number }

/** The list endpoint answers either a page (`{ rows, total, page, take }`) or a bare array; both give the same page here. */
export function normalizeHires(raw: unknown): HiresPage {
  if (Array.isArray(raw)) return { rows: raw as HireRow[], total: raw.length, page: 1, take: Math.max(raw.length, 1) };
  const body = (raw ?? {}) as Partial<HiresPage>;
  const rows = body.rows ?? [];
  return { rows, total: body.total ?? rows.length, page: body.page ?? 1, take: body.take ?? Math.max(rows.length, 1) };
}

/** The list URL for the current page address: only status (not "All"), search and page are sent. */
export function hiresPath(searchParams: Record<string, string>): string {
  const query = new URLSearchParams();
  if (searchParams.status && searchParams.status !== "All") query.set("status", searchParams.status);
  if (searchParams.search?.trim()) query.set("search", searchParams.search.trim());
  if (searchParams.page && searchParams.page !== "1") query.set("page", searchParams.page);
  const text = query.toString();
  return `/api/onboardings${text ? `?${text}` : ""}`;
}

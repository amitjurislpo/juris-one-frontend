/** Event groups for the audit filter (the API applies them); each matches action prefixes. */
export const AUDIT_GROUPS = {
  auth: { label: "Sign-in & accounts", prefixes: ["auth."] },
  people: { label: "Employees & access", prefixes: ["employee."] },
  roles: { label: "Roles, policies & company", prefixes: ["role.", "policy.", "asset.", "announcement."] },
  time: { label: "Leave & attendance", prefixes: ["leave.", "regularization.", "attendance."] },
  org: { label: "Departments & holidays", prefixes: ["department.", "holiday."] },
  payroll: { label: "Salary & payroll", prefixes: ["salary.", "payroll."] },
  tax: { label: "Tax & proofs", prefixes: ["tax.", "declaration.", "proof."] },
  letters: { label: "HR letters", prefixes: ["letter.", "letter_template."] },
  requests: { label: "API requests", prefixes: ["request."] },
  pages: { label: "Page views", prefixes: ["page."] },
} as const;
export type AuditGroup = keyof typeof AUDIT_GROUPS;

export interface AuditRow {
  id: string;
  occurredAt: string; // ISO timestamp with milliseconds
  actor: string;
  actorCode: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  subject: string | null; // employee the entity refers to, when it is one
  ipAddress: string | null;
  before: unknown;
  after: unknown;
  redacted: boolean;
  /** Request rows only (null on older entries). */
  method?: string | null;
  path?: string | null;
  status?: number | null;
  durationMs?: number | null;
  /** Platform audit only: the business, or "Platform". */
  business?: string;
}

/** "employee.access_toggle" → "Employee · access toggle" */
export const actionLabel = (action: string) => {
  const [head, ...rest] = action.split(".");
  return `${head.charAt(0).toUpperCase()}${head.slice(1)} · ${rest.join(" ").replace(/_/g, " ")}`;
};

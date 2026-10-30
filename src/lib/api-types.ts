/**
 * Shapes of data the Spring Boot API returns that the pages and client components render.
 * (Types only — the logic lives in backend/.)
 */
import type { Deductions, TaxResult } from "./tax/engine";
import type { DEFAULT_SETTINGS } from "./settings-defaults";

/** One line in the notification bell. */
export interface ShellNote {
  text: string;
  meta: string;
  href?: string;
  /** set for a stored notification (system lines such as "3 requests waiting" have none) */
  id?: string | null;
  unread?: boolean;
  /** stays until the policy is accepted */
  sticky?: boolean;
}

/** One item in the notification box. */
export interface InboxItem {
  id: string;
  text: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
  sticky: boolean;
}

export interface InboxPage {
  items: InboxItem[];
  unread: number;
  total: number;
  page: number;
  pages: number;
}

/** Leave apply preview (holidays skipped, paid vs LOP split). */
export interface Preview {
  from: string;
  to: string;
  dates: string[];
  skipped: { date: string; name: string }[];
  days: number;
  available: number;
  paidDays: number;
  lopDays: number;
  balanceAfter: number | null;
  error: string | null;
}

/** One payroll row (paise). */
export interface PayView {
  employeeId: string; photo?: number | null; code: string; name: string; department: string; regime: "NEW" | "OLD";
  monthlyGross: number; lop: number; attendanceLop: number; paid: number; days: number; bonus: number; earned: number; pfPt: number; tds: number; other: number; net: number;
  edited: boolean; note: string | null;
}

/** The immutable payslip stored when a payroll month closes (paise). */
export interface PayslipSnapshot {
  version: 1;
  month: string;
  company: { name: string; address: string };
  employee: { code: string; name: string; designation: string; department: string; dateOfJoining: string; panLast4: string | null; uanLast4: string | null; bankName: string | null; bankLast4: string | null };
  regime: "NEW" | "OLD";
  payDate: string;
  attendance: { daysInMonth: number; eligibleDays: number; weeklyOffs: number; holidays: number; present: number; lopDays: number; paidDays: number };
  components: { label: string; rate: number; earned: number }[];
  bonus: number;
  grossEarned: number;
  pf: number;
  pt: number;
  tds: number;
  otherDeduction: number;
  deductions: { label: string; amount: number }[];
  totalDeductions: number;
  net: number;
  netWords: string;
  note: string | null;
}

/** An employee's projected tax for the financial year (rupees). */
export interface TaxProjection {
  fy: string;
  regime: "NEW" | "OLD";
  monthsLeft: number; // remaining incl. current
  jurisIncome: number; // ₹ actuals + this month + projection
  jurisLabel: string;
  prevIncome: number;
  prevTds: number;
  jurisTdsSoFar: number;
  income: number;
  deductions: Deductions;
  current: TaxResult;
  newRegime: TaxResult;
  oldRegime: TaxResult;
  monthly: number; // ₹ TDS this month
  pfAnnual: number; // ₹ employee PF projected for the FY (counts under 80C)
  regimeOverridden: boolean;
}

/** A policy setting as stored (defaults merged with saved values). */
type SettingKey = keyof typeof DEFAULT_SETTINGS;
type Widen<T> = T extends readonly (infer Element)[] ? Widen<Element>[] : T extends object ? { -readonly [Key in keyof T]: Widen<T[Key]> } : T extends string ? string : T extends number ? number : T;
export type SettingValue<Key extends SettingKey> = Widen<(typeof DEFAULT_SETTINGS)[Key]>;

/** A business's subscription today (from the API). `daysLeft`: whole days until the end date (0 = ends today). */
export interface SubscriptionCurrent {
  state: "ACTIVE" | "UPCOMING" | "EXPIRED" | "NONE";
  active: boolean;
  planName: string | null;
  startsOn: string | null;
  endsOn: string | null;
  daysLeft: number | null;
  maxEmployees: number | null;
  modules: string[];
  employees: number;
}

/** One period of a business's subscription history (price in paise). */
export interface SubscriptionRow {
  id: string;
  planId: string;
  planName: string;
  startsOn: string;
  endsOn: string;
  pricePaise: number;
  status: "ACTIVE" | "CANCELLED";
  notes: string | null;
  createdAt: string;
}

/** A plan in the super admin's catalogue (price in paise; maxEmployees null = no limit). */
export interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  periodMonths: number;
  maxEmployees: number | null;
  modules: string[];
  active: boolean;
  businesses: number;
}

/** A web address a business used to have; retired for good. */
export interface SlugChange { slug: string; releasedAt: string; releasedBy: string | null }

export interface BusinessProfile {
  name: string;
  legalName: string | null;
  code: string;
  employeePrefix: string;
  gstin: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timeZone: string;
}

/** A module granted to a business on its own (price in paise; endsOn null = no end). */
export interface ModuleGrant {
  id: string;
  module: string;
  source: "COMPLIMENTARY" | "PAID";
  pricePaise: number;
  startsOn: string;
  endsOn: string | null;
  notes: string | null;
  createdAt: string;
  revokedAt: string | null;
  state: "ACTIVE" | "UPCOMING" | "ENDED" | "REVOKED";
}

/** A published policy as an employee reads it (current version). */
export interface PolicyToRead {
  id: string;
  version: number;
  title: string;
  body: string;
  fileName: string | null;
  publishedAt: string;
  requiresAcknowledgement?: boolean;
  acknowledgedAt?: string | null;
}

/** A policy as HR / the owner manage it: the draft, its published versions and who accepted the current one. */
export interface PolicyDetail {
  id: string; title: string; body: string; fileName: string | null; requiresAcknowledgement: boolean; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; version: number;
  updatedAt: string; hasChanges: boolean;
  versions: { versionId: string; version: number; title: string; publishedAt: string; publishedBy: string | null; fileName: string | null; requiresAcknowledgement: boolean;
    bodySha256: string; fileSha256: string | null; acknowledgements: number }[];
  people: { code: string; name: string; department: string | null; acknowledgedAt: string | null; lastVersion: number | null }[];
}

/** One asset of the register (GET /api/v1/assets); holder* is set while it is assigned. */
export interface AssetRow {
  id: string; tag: string; type: string; make: string | null; model: string | null; serial: string | null; purchaseDate: string | null;
  status: "AVAILABLE" | "ASSIGNED" | "IN_REPAIR" | "RETIRED"; notes: string | null;
  holderId: string | null; holderCode: string | null; holderName: string | null; heldSince: string | null;
}

/** One time an asset was held by an employee (returnedOn null = still held). */
export interface AssetAssignment {
  id: string; assetId: string; tag: string; type: string; make: string | null; model: string | null; serial: string | null;
  employeeId: string; employeeCode: string; employeeName: string;
  assignedOn: string; assignNotes: string | null; assignedBy: string | null;
  returnedOn: string | null; returnCondition: "GOOD" | "FAIR" | "DAMAGED" | "LOST" | null; returnNotes: string | null; returnedBy: string | null;
}

export interface Announcement {
  id: string; title: string; body: string; audience: "ALL" | "IN" | "US"; pinned: boolean; expiresOn: string | null;
  status: "PUBLISHED" | "UNPUBLISHED"; author: string | null; createdAt: string; active: boolean;
}

export type LetterType = "OFFER" | "APPOINTMENT" | "EXPERIENCE" | "RELIEVING" | "EMPLOYMENT_VERIFICATION";

export interface LetterTemplateRow {
  id: string; type: LetterType; name: string; subject: string; needsSalary: boolean; active: boolean; version: number; updatedAt: string;
}

export interface LetterTemplateDetail extends LetterTemplateRow { body: string }

export interface LetterField { name: string; label: string; salary: boolean }

/** An issued letter (list rows have no text). */
export interface IssuedLetter {
  id: string; reference: string; type: LetterType; templateName: string; subject: string; employeeId: string; employeeCode: string; employeeName: string;
  issuedBy: string; issuedAt: string; needsSalary: boolean; canOpen: boolean;
}

/** A role the super admin hands to businesses (copied into a business when assigned). */
export interface RoleTemplate {
  key: string;
  name: string;
  locked: boolean;
  mandatory: boolean;
  active: boolean;
  permissions: string[];
  assignable: string[];
  businesses: number;
}

export interface RoleTemplates {
  templates: RoleTemplate[];
  groups: { name: string; permissions: { key: string; label: string }[] }[];
}

// ----- task management (backend plan §12.4: the JSON field names are binding) -----

export type TaskStatusCategory = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type TaskType = "TASK" | "ISSUE" | "REQUEST" | "MILESTONE";
export type ProjectRole = "OWNER" | "MEMBER" | "VIEWER";
export type ProjectVisibility = "PRIVATE" | "BUSINESS";

/** One page of a collection. */
export interface TaskPage<Row> {
  page: number;
  take: number;
  total: number;
  rows: Row[];
}

export interface ProjectRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  visibility: ProjectVisibility;
  status: "ACTIVE" | "ARCHIVED";
  color: string | null;
  departmentId: string | null;
  departmentName: string | null;
  ownerNames: string[];
  myRole: ProjectRole | null;
  memberCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  updatedAt: string;
}

/** A workflow step (status) of a project, or of the business default set. */
export interface WorkflowStatus {
  id: string;
  name: string;
  category: TaskStatusCategory;
  color: string | null;
  position: number;
  isInitial: boolean;
  taskCount: number;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string | null;
  projectId: string | null;
}

export interface ProjectDetail extends ProjectRow {
  version: number;
  statuses: WorkflowStatus[];
  labels: TaskLabel[];
  canManage: boolean;
  canCreateTasks: boolean;
}

export interface ProjectMember {
  employeeId: string;
  code: string;
  name: string;
  photo: number | null;
  designation: string | null;
  role: ProjectRole;
  isActive: boolean;
}

export interface TaskRow {
  id: string;
  key: string | null;
  number: number | null;
  projectId: string | null;
  projectKey: string | null;
  projectName: string | null;
  parentTaskId: string | null;
  parentKey: string | null;
  title: string;
  type: TaskType;
  statusId: string;
  statusName: string;
  statusCategory: TaskStatusCategory;
  statusColor: string | null;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeCode: string | null;
  assigneePhoto: number | null;
  isAssigneeActive: boolean | null;
  indirectAssigneeId: string | null;
  indirectAssigneeName: string | null;
  indirectAssigneeCode: string | null;
  indirectAssigneePhoto: number | null;
  isIndirectAssigneeActive: boolean | null;
  myAssignment: "DIRECT" | "INDIRECT" | null;
  reporterId: string;
  reporterName: string;
  startDate: string | null;
  dueDate: string | null;
  /** "HH:mm" or null (due at the end of the day). */
  dueTime: string | null;
  /** The task time zone (IANA): the direct assignee's. */
  dueTimeZone: string | null;
  estimateMinutes: number | null;
  /** Minutes before the due moment for the extra reminder (15, 60, 240 or 1440), or null. */
  reminderBeforeMinutes: number | null;
  isOverdue: boolean;
  labels: { id: string; name: string; color: string | null }[];
  subtaskCount: number;
  subtaskDoneCount: number;
  checklistCount: number;
  checklistDoneCount: number;
  commentCount: number;
  attachmentCount: number;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** For a PATCH straight from a list (the My tasks checkbox and board); added to the rows by the backend (frontend notes 1). */
  version: number;
}

interface TaskPermissions {
  canEdit: boolean;
  canComment: boolean;
  canChangeStatus: boolean;
  canChangePriority: boolean;
  canChangeDirectAssignee: boolean;
  canChangeIndirectAssignee: boolean;
  canDelete: boolean;
  canManageProject: boolean;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  isDone: boolean;
  position: number;
  doneByName: string | null;
  doneAt: string | null;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
  canDelete: boolean;
}

export interface TaskDetail extends TaskRow {
  description: string | null;
  version: number;
  reporterPhoto: number | null;
  completedByName: string | null;
  previousKeys: string[];
  watchers: { employeeId: string; name: string; photo: number | null }[];
  isWatching: boolean;
  subtasks: TaskRow[];
  checklist: TaskChecklistItem[];
  attachments: TaskAttachment[];
  /** Names of the people `@{uuid}` tokens in the description refer to. */
  mentionedPeople: Record<string, string>;
  statuses: WorkflowStatus[];
  permissions: TaskPermissions;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: number | null;
  body: string | null;
  mentionedPeople: Record<string, string>;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface TaskActivityEntry {
  id: string;
  kind: string;
  actorName: string | null;
  before: unknown;
  after: unknown;
  occurredAt: string;
}

/** GET /api/v1/tasks/mine */
export interface MyTasksPage extends TaskPage<TaskRow> {
  counts: { overdue: number; today: number; thisWeek: number; later: number; noDate: number };
}

/** One person in Team tasks. */
interface TeamPerson {
  employeeId: string;
  name: string;
  code: string;
  photo: number | null;
  depth: number;
  open: number;
  overdue: number;
  doneLast7Days: number;
}

/** GET /api/v1/tasks/team */
export interface TeamTasksPage extends TaskPage<TaskRow> {
  people: TeamPerson[];
}

/** GET /api/v1/projects/{projectId}/board */
export interface ProjectBoard {
  columns: { status: WorkflowStatus; taskCount: number; tasks: TaskRow[] }[];
  hasMoreDone: boolean;
}

/** GET /api/v1/tasks/assignees (person picker). */
export interface TaskAssignee {
  id: string;
  code: string;
  name: string;
  photo: number | null;
  designation: string | null;
  isMember: boolean;
  reportingManagerId: string | null;
  /** Shown in the "Accountable" suggestion of the create form. */
  reportingManagerName: string | null;
}

/** GET /api/v1/task-settings */
export interface TaskSettings {
  defaultStatuses: WorkflowStatus[];
  labels: TaskLabel[];
  projectCount: number;
  taskCount: number;
}

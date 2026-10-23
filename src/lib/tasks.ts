/**
 * Task management: constants and pure helpers shared by the task pages (no React, no API calls; unit-tested in
 * tests/unit/tasks.test.ts). Labels are English translation keys.
 */
import type { ProjectRole, ProjectVisibility, TaskActivityEntry, TaskPriority, TaskRow, TaskStatusCategory, TaskType } from "./api-types";
import { daysBetween, formatDayMonth, formatDayMonthYear } from "./format";
import type { T } from "./i18n/translate";

export const TASK_TYPES: Record<TaskType, string> = { TASK: "Task", ISSUE: "Issue", REQUEST: "Request", MILESTONE: "Milestone" };

/** Highest first; `className` colours the small priority flag. */
export const TASK_PRIORITIES: Record<TaskPriority, { label: string; className: string }> = {
  URGENT: { label: "Urgent", className: "task-prio-urgent" },
  HIGH: { label: "High", className: "task-prio-high" },
  MEDIUM: { label: "Medium", className: "task-prio-medium" },
  LOW: { label: "Low", className: "task-prio-low" },
  NONE: { label: "No priority", className: "task-prio-none" },
};
const PRIORITY_ORDER = Object.keys(TASK_PRIORITIES) as TaskPriority[];

/** 0 = most urgent. */
export const priorityRank = (priority: TaskPriority) => PRIORITY_ORDER.indexOf(priority);

export const STATUS_CATEGORIES: Record<TaskStatusCategory, string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };

/** The built-in workflow steps (backend WorkflowRules.DEFAULT_STATUSES): shown translated; names people type stay as typed. */
const DEFAULT_STATUS_NAMES = ["To do", "In progress", "In review", "Done", "Cancelled"];
export const statusName = (name: string, t: T) => (DEFAULT_STATUS_NAMES.includes(name) ? t(name) : name);

export const PROJECT_ROLES: Record<ProjectRole, string> = { OWNER: "Owner", MEMBER: "Member", VIEWER: "Viewer" };

export const VISIBILITIES: Record<ProjectVisibility, { label: string; hint: string }> = {
  PRIVATE: { label: "Private", hint: "Only members (and the business owner) can see it." },
  BUSINESS: { label: "Company-wide", hint: "Everyone in the business can see it and comment; members do the work." },
};

/** The fixed palette (backend: projects.color, task_statuses.color, task_labels.color) → a chip tone of the design. */
export const PROJECT_COLORS: Record<string, { label: string; tone: string }> = {
  purple: { label: "Purple", tone: "gold" },
  blue: { label: "Blue", tone: "info" },
  green: { label: "Green", tone: "ok" },
  amber: { label: "Amber", tone: "warn" },
  red: { label: "Red", tone: "bad" },
  grey: { label: "Grey", tone: "neutral" },
};
export const colorTone = (color: string | null | undefined) => (color && PROJECT_COLORS[color]?.tone) || "neutral";

export type DueBucket = "OVERDUE" | "TODAY" | "THIS_WEEK" | "LATER" | "NO_DATE";
export const DUE_BUCKETS: { key: DueBucket; label: string }[] = [
  { key: "OVERDUE", label: "Overdue" },
  { key: "TODAY", label: "Today" },
  { key: "THIS_WEEK", label: "This week" },
  { key: "LATER", label: "Later" },
  { key: "NO_DATE", label: "No date" },
];

/** Display grouping by due date against `today` (ISO); the week runs Monday–Sunday. The server's `isOverdue` is the truth. */
export function dueBucket(dueDate: string | null, today: string): DueBucket {
  if (!dueDate) return "NO_DATE";
  const days = daysBetween(today, dueDate);
  if (days < 0) return "OVERDUE";
  if (days === 0) return "TODAY";
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const daysLeftInWeek = weekday === 0 ? 0 : 7 - weekday;
  return days <= daysLeftInWeek ? "THIS_WEEK" : "LATER";
}

/** A row's bucket: overdue when the server says so (a timed task can be overdue on its due day), else by date. */
export function taskBucket(row: Pick<TaskRow, "dueDate" | "isOverdue">, today: string): DueBucket {
  if (row.isOverdue) return "OVERDUE";
  const bucket = dueBucket(row.dueDate, today);
  // the task's own time zone may be a day behind the viewer's: not overdue for the server means not overdue here
  return bucket === "OVERDUE" ? "TODAY" : bucket;
}

/** Rows grouped by due bucket, in bucket order (server order kept inside a bucket); empty buckets are left out. */
export function groupByDue<Row extends Pick<TaskRow, "dueDate" | "isOverdue">>(rows: Row[], today: string): { bucket: DueBucket; label: string; rows: Row[] }[] {
  return DUE_BUCKETS.map(({ key, label }) => ({ bucket: key, label, rows: rows.filter((row) => taskBucket(row, today) === key) })).filter((group) => group.rows.length > 0);
}

/**
 * Sort order by due (backend §8.6): by date; within a day the timed tasks first (by time) and the date-only ones last,
 * because a date-only task is due at the end of its day; tasks without a date last of all.
 */
export function compareDue(first: Pick<TaskRow, "dueDate" | "dueTime">, second: Pick<TaskRow, "dueDate" | "dueTime">): number {
  if (first.dueDate !== second.dueDate) {
    if (!first.dueDate) return 1;
    if (!second.dueDate) return -1;
    return first.dueDate < second.dueDate ? -1 : 1;
  }
  const firstTime = first.dueTime ?? "24:00", secondTime = second.dueTime ?? "24:00";
  return firstTime === secondTime ? 0 : firstTime < secondTime ? -1 : 1;
}

/** "America/New_York" → "New York". */
const zoneCity = (timeZone: string) => (timeZone.split("/").pop() ?? timeZone).replace(/_/g, " ");

/**
 * "21 Oct", "21 Oct, 17:00", or "21 Oct, 17:00 New York time" when the task's time zone differs from the viewer's.
 * A date-only task shows just the date (it is due at the end of that day). The year is added when it is not `today`'s.
 */
export function formatDue(dueDate: string | null, dueTime: string | null, dueTimeZone: string | null, viewerTimeZone: string, options: { today?: string; t?: T } = {}): string {
  if (!dueDate) return "";
  const date = options.today && options.today.slice(0, 4) !== dueDate.slice(0, 4) ? formatDayMonthYear(dueDate) : formatDayMonth(dueDate);
  if (!dueTime) return date;
  if (!dueTimeZone || dueTimeZone === viewerTimeZone) return `${date}, ${dueTime}`;
  const vars = { time: dueTime, zone: zoneCity(dueTimeZone) };
  return `${date}, ${options.t ? options.t("{time} {zone} time", vars) : `${vars.time} ${vars.zone} time`}`;
}

/** 45 → "45m", 240 → "4h", 90 → "1h 30m". */
export function formatEstimate(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** "4h", "1h 30m", "90", "45m" → minutes; null when empty, NaN when unreadable. */
export function parseEstimate(text: string): number | null {
  const value = text.trim().toLowerCase();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/.exec(value);
  if (!match || (!match[1] && !match[2])) return NaN;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

export const formatFileSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** What the API accepts as an attachment (backend §11); checked here first so the user hears it at once. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "docx", "xlsx", "pptx", "txt", "csv"];
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(",");
export function attachmentProblem(fileName: string, sizeBytes: number): "size" | "type" | null {
  const extension = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
  if (!ATTACHMENT_EXTENSIONS.includes(extension)) return "type";
  if (sizeBytes > MAX_ATTACHMENT_BYTES) return "size";
  return null;
}

/** A suggested project key from its name: "Website relaunch" → "WEB" (backend rule ^[A-Z][A-Z0-9]{1,5}$). */
export function suggestProjectKey(name: string): string {
  const words = name.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  // a key starts with a letter: begin at the first word that has one
  const first = words.findIndex((word) => /[A-Z]/.test(word));
  if (first < 0) return "";
  let key = words[first].replace(/^[0-9]+/, "").slice(0, 3);
  for (const word of words.slice(first + 1)) {
    if (key.length >= 2) break;
    key += word.charAt(0);
  }
  key = key.slice(0, 6);
  return /^[A-Z][A-Z0-9]{1,5}$/.test(key) ? key : "";
}

// ----- mentions: stored text carries @{employee-uuid}; the editor shows @Name -----

const MENTION_TOKEN = /@\{([0-9a-fA-F-]{36})\}/g;

export type MentionPart = { kind: "text"; text: string } | { kind: "mention"; employeeId: string; name: string | null };

/** Stored text → plain text and mention parts (`name` null when the id is not in `people`). */
export function splitMentions(text: string, people: Record<string, string> = {}): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION_TOKEN)) {
    if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
    parts.push({ kind: "mention", employeeId: match[1], name: people[match[1]] ?? null });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/** Stored text → what the editor shows (`@{uuid}` → `@Name`), plus the people it names so they can be stored again. */
export function mentionsToNames(text: string, people: Record<string, string>): { text: string; mentioned: { id: string; name: string }[] } {
  const mentioned: { id: string; name: string }[] = [];
  const shown = text.replace(MENTION_TOKEN, (token, employeeId: string) => {
    const name = people[employeeId];
    if (!name) return token;
    if (!mentioned.some((person) => person.id === employeeId)) mentioned.push({ id: employeeId, name });
    return `@${name}`;
  });
  return { text: shown, mentioned };
}

/** Editor text → stored text: each `@Name` of a person picked in the editor becomes `@{uuid}` (longest names first). */
export function namesToMentions(text: string, mentioned: { id: string; name: string }[]): string {
  return [...mentioned].sort((first, second) => second.name.length - first.name.length)
    .reduce((current, person) => current.split(`@${person.name}`).join(`@{${person.id}}`), text);
}

/** The partial name typed after an `@` that ends at the caret ("@Naz|" → "Naz"), or null when the caret is not in a mention. */
export function mentionQueryAt(text: string, caret: number): string | null {
  const match = /(^|\s)@([^\s@{}]{0,30})$/.exec(text.slice(0, caret));
  return match ? match[2] : null;
}

/** Replaces the `@query` before the caret with `@Name ` and returns the new text and caret. */
export function insertMention(text: string, caret: number, name: string): { text: string; caret: number } {
  const query = mentionQueryAt(text, caret);
  if (query === null) return { text, caret };
  const start = caret - query.length - 1;
  const inserted = `@${name} `;
  return { text: text.slice(0, start) + inserted + text.slice(caret), caret: start + inserted.length };
}

// ----- board ordering -----

/** Where a dragged card lands: the number of other cards whose middle is above the pointer. */
export const dropIndex = (cardMiddles: number[], pointerY: number) => cardMiddles.filter((middle) => middle < pointerY).length;

/** The neighbours of a card placed at `index` among the column's other cards (the moved card itself left out). */
export function neighboursAt(columnTaskIds: string[], movedTaskId: string, index: number): { previousTaskId?: string; nextTaskId?: string } {
  const others = columnTaskIds.filter((id) => id !== movedTaskId);
  const position = Math.max(0, Math.min(index, others.length));
  return { previousTaskId: others[position - 1], nextTaskId: others[position] };
}

/** The columns with one card moved (an optimistic view while the move is saved). `index` counts the target column's other cards. */
export function applyMove<Card extends { id: string }>(columns: { key: string; cards: Card[] }[], move: { taskId: string; toKey: string; index: number }) {
  const card = columns.flatMap((column) => column.cards).find((candidate) => candidate.id === move.taskId);
  if (!card) return columns;
  return columns.map((column) => {
    const cards = column.cards.filter((candidate) => candidate.id !== move.taskId);
    if (column.key === move.toKey) cards.splice(Math.max(0, Math.min(move.index, cards.length)), 0, card);
    return { ...column, cards };
  });
}

export type KeyboardMove = "up" | "down" | "top" | "bottom";
/** Index (among the column's other cards) a keyboard move goes to, or null when the card would not move. */
export function keyboardMoveIndex(currentIndex: number, columnLength: number, move: KeyboardMove): number | null {
  const target = move === "up" ? currentIndex - 1 : move === "down" ? currentIndex + 1 : move === "top" ? 0 : columnLength - 1;
  if (target < 0 || target > columnLength - 1 || target === currentIndex) return null;
  return target;
}

// ----- list queries -----

/** URL parameters that only steer the screen (open drawer, view, board column) and never go to the API. */
const SCREEN_PARAMETERS = ["task", "view", "column"];

/** `/api/tasks/mine?…` from the page URL: defaults, then the URL's filters (screen-only ones left out), then fixed values. */
export function taskListPath(basePath: string, searchParams: Record<string, string>, defaults: Record<string, string> = {}, fixed: Record<string, string> = {}): string {
  const query = new URLSearchParams();
  const merged: Record<string, string> = { ...defaults };
  for (const [name, value] of Object.entries(searchParams)) if (!SCREEN_PARAMETERS.includes(name)) merged[name] = value;
  Object.assign(merged, fixed);
  for (const [name, value] of Object.entries(merged)) if (value !== "") query.set(name, value);
  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/** Whether the URL narrows the list beyond the page's defaults (for "No tasks match these filters"). */
export const hasFilters = (searchParams: Record<string, string>) =>
  Object.keys(searchParams).some((name) => !SCREEN_PARAMETERS.includes(name) && !["sort", "sortDirection", "page"].includes(name));

// ----- history sentences -----

/** A before/after value of an activity entry as text (a name, a status, a date…). */
export function activityValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" && /^\s*[{[]/.test(value)) {
    try { return activityValue(JSON.parse(value)); } catch { return value; }
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(activityValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const field of ["name", "statusName", "assigneeName", "indirectAssigneeName", "fileName", "title", "status", "priority", "type", "value"]) {
      if (record[field] !== undefined && record[field] !== null && typeof record[field] !== "object") return String(record[field]);
    }
    const first = Object.values(record).find((entry) => entry !== null && typeof entry !== "object");
    return first === undefined ? "" : String(first);
  }
  return "";
}

/** English labels for enum values that appear in the history (priority, type, status category). */
const VALUE_LABELS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(TASK_PRIORITIES).map(([value, priority]) => [value, priority.label])),
  ...TASK_TYPES,
  ...STATUS_CATEGORIES,
};

/** One history entry as a translation key and its placeholders ("{name} changed the status from {from} to {to}"). */
export function describeActivity(entry: Pick<TaskActivityEntry, "kind" | "actorName" | "before" | "after">): { text: string; vars: Record<string, string> } {
  const name = entry.actorName ?? "JurisOne";
  const label = (value: unknown) => { const text = activityValue(value); return VALUE_LABELS[text] ?? text; };
  const from = label(entry.before), to = label(entry.after);
  switch (entry.kind) {
    case "CREATED": return { text: "{name} created this task", vars: { name } };
    case "TITLE_CHANGED": return { text: "{name} renamed this task to {to}", vars: { name, to } };
    case "DESCRIPTION_CHANGED": return { text: "{name} changed the description", vars: { name } };
    case "TYPE_CHANGED": return { text: "{name} changed the type from {from} to {to}", vars: { name, from, to } };
    case "STATUS_CHANGED": return { text: "{name} changed the status from {from} to {to}", vars: { name, from, to } };
    case "PRIORITY_CHANGED": return { text: "{name} changed the priority from {from} to {to}", vars: { name, from, to } };
    case "ASSIGNEE_CHANGED": return to ? { text: "{name} assigned this to {assignee}", vars: { name, assignee: to } } : { text: "{name} removed the assignee", vars: { name } };
    case "INDIRECT_ASSIGNEE_CHANGED": return to ? { text: "{name} made {person} accountable", vars: { name, person: to } } : { text: "{name} removed the accountable person", vars: { name } };
    case "DATES_CHANGED": return { text: "{name} changed the dates", vars: { name } };
    case "ESTIMATE_CHANGED": return { text: "{name} changed the estimate", vars: { name } };
    case "LABELS_CHANGED": return { text: "{name} changed the labels", vars: { name } };
    case "PARENT_CHANGED": return { text: "{name} changed the parent task", vars: { name } };
    case "MOVED_PROJECT": return { text: "{name} moved this task to another project", vars: { name } };
    case "CHECKLIST_CHANGED": return { text: "{name} updated the checklist", vars: { name } };
    case "ATTACHMENT_ADDED": return to ? { text: "{name} attached {file}", vars: { name, file: to } } : { text: "{name} added an attachment", vars: { name } };
    case "ATTACHMENT_REMOVED": return { text: "{name} removed an attachment", vars: { name } };
    case "COMMENT_DELETED": return { text: "{name} deleted a comment", vars: { name } };
    case "DELETED": return { text: "{name} deleted this task", vars: { name } };
    default: return { text: "{name} changed this task", vars: { name } };
  }
}

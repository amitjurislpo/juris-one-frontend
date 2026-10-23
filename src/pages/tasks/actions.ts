
import type { ActionResult } from "@/lib/action";
import { apiAction, apiUpload } from "@/lib/api";
import type { TaskPriority, TaskStatusCategory, TaskType } from "@/lib/api-types";

// Task-level writes shared by every task view (My tasks, Team tasks, project list and board, the task page and panel).
// Paths and methods follow the backend plan §12.1 (TaskController, TaskCollaborationController).
const enc = encodeURIComponent;

/** POST /api/tasks body (backend `TaskInput`); only the fields that are set are sent. */
export interface TaskInput {
  projectId?: string | null;
  title: string;
  description?: string | null;
  type?: TaskType;
  statusId?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  indirectAssigneeId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  reminderBeforeMinutes?: number | null;
  estimateMinutes?: number | null;
  labelIds?: string[];
  parentTaskId?: string | null;
  checklist?: string[];
}

/** PATCH /api/tasks/{taskId}: `version` plus the changed fields only (`null` clears one; `statusCategory` instead of `statusId`). */
export type TaskChanges = { version: number } & Partial<{
  title: string;
  description: string | null;
  type: TaskType;
  statusId: string;
  statusCategory: TaskStatusCategory;
  priority: TaskPriority;
  assigneeId: string | null;
  indirectAssigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  dueTime: string | null;
  reminderBeforeMinutes: number | null;
  estimateMinutes: number | null;
  labelIds: string[];
  parentTaskId: string | null;
  projectId: string | null;
}>;

export async function createTask(input: TaskInput): Promise<ActionResult<{ id: string; key: string | null }>> {
  return apiAction("POST", "/api/tasks", input);
}

export async function updateTask(taskId: string, changes: TaskChanges): Promise<ActionResult<{ version: number }>> {
  return apiAction("PATCH", `/api/tasks/${enc(taskId)}`, changes);
}

/** A board move: the target step and the cards it lands between (both absent = bottom of the column). */
export async function moveTask(taskId: string, target: { statusId: string; previousTaskId?: string; nextTaskId?: string }): Promise<ActionResult<{ statusId: string; position: number }>> {
  return apiAction("PUT", `/api/tasks/${enc(taskId)}/position`, target);
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/tasks/${enc(taskId)}`);
}

export async function followTask(taskId: string, employeeId: string): Promise<ActionResult> {
  return apiAction("PUT", `/api/tasks/${enc(taskId)}/watchers/${enc(employeeId)}`);
}

export async function unfollowTask(taskId: string, employeeId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/tasks/${enc(taskId)}/watchers/${enc(employeeId)}`);
}

export async function addChecklistItem(taskId: string, text: string): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", `/api/tasks/${enc(taskId)}/checklist-items`, { text });
}

export async function updateChecklistItem(taskId: string, itemId: string, changes: { text?: string; isDone?: boolean; position?: number }): Promise<ActionResult> {
  return apiAction("PATCH", `/api/tasks/${enc(taskId)}/checklist-items/${enc(itemId)}`, changes);
}

export async function deleteChecklistItem(taskId: string, itemId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/tasks/${enc(taskId)}/checklist-items/${enc(itemId)}`);
}

export async function addComment(taskId: string, body: string): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", `/api/tasks/${enc(taskId)}/comments`, { body });
}

export async function editComment(taskId: string, commentId: string, body: string): Promise<ActionResult> {
  return apiAction("PATCH", `/api/tasks/${enc(taskId)}/comments/${enc(commentId)}`, { body });
}

export async function deleteComment(taskId: string, commentId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/tasks/${enc(taskId)}/comments/${enc(commentId)}`);
}

/** Multipart, part `file`. */
export async function uploadTaskAttachment(taskId: string, file: File): Promise<ActionResult<{ id: string; name: string }>> {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload(`/api/tasks/${enc(taskId)}/attachments`, formData);
}

export async function deleteTaskAttachment(taskId: string, attachmentId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/tasks/${enc(taskId)}/attachments/${enc(attachmentId)}`);
}


import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";
import type { WorkflowStatusInput } from "@/pages/projects/actions";

// The business's default workflow (personal tasks, copied into new projects): backend plan §12.1 S2–S5 (TaskSettingsController).
const enc = encodeURIComponent;

export async function createDefaultStatus(input: WorkflowStatusInput): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", "/api/v1/task-settings/workflow-statuses", input);
}

export async function updateDefaultStatus(statusId: string, input: WorkflowStatusInput & { isInitial: boolean }): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/task-settings/workflow-statuses/${enc(statusId)}`, input);
}

export async function reorderDefaultStatuses(statusIds: string[]): Promise<ActionResult> {
  return apiAction("PUT", "/api/v1/task-settings/workflow-status-order", { statusIds });
}

export async function deleteDefaultStatus(statusId: string, moveTasksToStatusId?: string): Promise<ActionResult> {
  const query = moveTasksToStatusId ? `?moveTasksToStatusId=${enc(moveTasksToStatusId)}` : "";
  return apiAction("DELETE", `/api/v1/task-settings/workflow-statuses/${enc(statusId)}${query}`);
}

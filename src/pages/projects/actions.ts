
import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";
import type { ProjectRole, ProjectVisibility, TaskStatusCategory } from "@/lib/api-types";

// Projects, their members, workflow steps and labels (backend plan §12.1: ProjectController, TaskLabelController).
const enc = encodeURIComponent;

export interface ProjectInput {
  name: string;
  description: string | null;
  visibility: ProjectVisibility;
  color: string | null;
  departmentId: string | null;
}

export interface WorkflowStatusInput {
  name: string;
  category: TaskStatusCategory;
  color: string | null;
}

export async function createProject(input: ProjectInput & { key: string }): Promise<ActionResult<{ id: string; key: string }>> {
  return apiAction("POST", "/api/v1/projects", input);
}

/** `key` is always sent (the current one once the project has tasks: it can't change then). */
export async function updateProject(projectId: string, input: ProjectInput & { version: number; key: string }): Promise<ActionResult<{ version: number }>> {
  return apiAction("PUT", `/api/v1/projects/${enc(projectId)}`, input);
}

export async function setProjectStatus(projectId: string, status: "ACTIVE" | "ARCHIVED"): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/projects/${enc(projectId)}/status`, { status });
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/projects/${enc(projectId)}`);
}

export async function addProjectMember(projectId: string, employeeId: string, role: ProjectRole): Promise<ActionResult> {
  return apiAction("POST", `/api/v1/projects/${enc(projectId)}/members`, { employeeId, role });
}

export async function changeProjectMemberRole(projectId: string, employeeId: string, role: ProjectRole): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/projects/${enc(projectId)}/members/${enc(employeeId)}`, { role });
}

/** Also how a member leaves the project (their own id). */
export async function removeProjectMember(projectId: string, employeeId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/projects/${enc(projectId)}/members/${enc(employeeId)}`);
}

export async function createProjectStatus(projectId: string, input: WorkflowStatusInput): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", `/api/v1/projects/${enc(projectId)}/workflow-statuses`, input);
}

export async function updateProjectStatus(projectId: string, statusId: string, input: WorkflowStatusInput & { isInitial: boolean }): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/projects/${enc(projectId)}/workflow-statuses/${enc(statusId)}`, input);
}

export async function reorderProjectStatuses(projectId: string, statusIds: string[]): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/projects/${enc(projectId)}/workflow-status-order`, { statusIds });
}

export async function deleteProjectStatus(projectId: string, statusId: string, moveTasksToStatusId?: string): Promise<ActionResult> {
  const query = moveTasksToStatusId ? `?moveTasksToStatusId=${enc(moveTasksToStatusId)}` : "";
  return apiAction("DELETE", `/api/v1/projects/${enc(projectId)}/workflow-statuses/${enc(statusId)}${query}`);
}

/** Without `projectId` a company-wide label (Task settings). */
export async function createTaskLabel(input: { name: string; color: string | null; projectId?: string }): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", "/api/v1/task-labels", input);
}

export async function updateTaskLabel(labelId: string, input: { name: string; color: string | null }): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/task-labels/${enc(labelId)}`, input);
}

export async function deleteTaskLabel(labelId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/task-labels/${enc(labelId)}`);
}

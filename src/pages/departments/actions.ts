
import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";

// Departments run in the Spring Boot API (/api/v1/departments).

export async function createDepartment(input: { name: string; headId?: string; description?: string }): Promise<ActionResult> {
  return apiAction("POST", "/api/v1/departments", input, ["/departments"]);
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/departments/${encodeURIComponent(id)}`, undefined, ["/departments"]);
}

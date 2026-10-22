
import type { ActionResult } from "@/lib/action";
import { apiAction, apiCall } from "@/lib/api";
import type { Preview } from "@/lib/api-types";

// Leave requests run in the Spring Boot API (/api/leave).
const PAGES = ["/leave", "/approvals", "/home"];

export interface ApplyInput {
  type: string;
  from: string;
  to: string;
  part: "FULL" | "FIRST_HALF" | "SECOND_HALF";
  reason?: string;
}

/** Live numbers for the apply form — same rules the server enforces on submit. */
export async function preview(input: ApplyInput): Promise<ActionResult<Preview>> {
  const queryParameters = new URLSearchParams({ type: input.type, from: input.from, to: input.to, part: input.part });
  return (await apiCall<Preview>("GET", `/api/leave/previews?${queryParameters}`)).body;
}

export async function applyLeave(input: ApplyInput): Promise<ActionResult> {
  return apiAction("POST", "/api/leave/requests", input, PAGES);
}

export async function cancelLeave(id: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/leave/requests/${encodeURIComponent(id)}`, undefined, PAGES);
}

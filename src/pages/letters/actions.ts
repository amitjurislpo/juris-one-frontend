
import type { ActionResult } from "@/lib/action";
import { apiAction, apiCall } from "@/lib/api";
import type { LetterTemplateDetail, LetterType } from "@/lib/api-types";

// HR letters run in the Spring Boot API (/api/letters).
const enc = encodeURIComponent;
const PAGES = ["/letters", "/my-letters"];

export interface TemplateInput { type: LetterType; name: string; subject: string; body: string; active?: boolean }

export async function createTemplate(input: TemplateInput): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", "/api/letters/templates", input, PAGES);
}

export async function updateTemplate(id: string, input: Omit<TemplateInput, "type">): Promise<ActionResult> {
  return apiAction("PUT", `/api/letters/templates/${enc(id)}`, input, PAGES);
}

export async function templateDetail(id: string): Promise<ActionResult<LetterTemplateDetail>> {
  return (await apiCall<LetterTemplateDetail>("GET", `/api/letters/templates/${enc(id)}`)).body;
}

/** What the letter would say (nothing is saved). */
export async function previewLetter(input: { templateId: string; employeeId: string; lastWorkingDate: string }): Promise<ActionResult<{ subject: string; text: string; needsSalary: boolean }>> {
  const queryParameters = new URLSearchParams({ templateId: input.templateId, employeeId: input.employeeId });
  if (input.lastWorkingDate) queryParameters.set("lastWorkingDate", input.lastWorkingDate);
  return (await apiCall<{ subject: string; text: string; needsSalary: boolean }>("GET", `/api/letters/previews?${queryParameters}`)).body;
}

export async function issueLetter(input: { templateId: string; employeeId: string; lastWorkingDate: string }): Promise<ActionResult<{ id: string; reference: string }>> {
  return apiAction("POST", "/api/letters", { templateId: input.templateId, employeeId: input.employeeId, lastWorkingDate: input.lastWorkingDate || undefined }, PAGES);
}

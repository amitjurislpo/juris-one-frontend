
import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";

// Declarations run in the Spring Boot API (/api/declarations).
const PAGES = ["/declare", "/proofs", "/tax"];

export async function setRegime(regime: "NEW" | "OLD"): Promise<ActionResult> {
  return apiAction("PUT", "/api/declarations/regime", { regime }, PAGES);
}

export async function saveProfile(input: { metro: boolean; parentsSenior: boolean; landlordPan: string }): Promise<ActionResult> {
  return apiAction("PUT", "/api/declarations/profile", input, PAGES);
}

/** Saves a declared amount (₹). Changing an approved or rejected amount sends it back to Draft. */
export async function saveItem(input: { key: string; amount: number }): Promise<ActionResult> {
  return apiAction("PUT", `/api/declarations/items/${encodeURIComponent(input.key)}`, { amount: input.amount }, PAGES);
}

/** Sends every draft with an amount for verification; each needs a proof. */
export async function submitForVerification(): Promise<ActionResult> {
  return apiAction("POST", "/api/declarations/submissions", {}, PAGES);
}

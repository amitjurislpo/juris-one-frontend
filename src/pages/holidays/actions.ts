
import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";

// The holiday calendar runs in the Spring Boot API (/api/v1/holidays).
const PAGES = ["/holidays", "/home", "/attendance", "/register", "/settings", "/team"];

export async function addHoliday(input: { date: string; name: string; region: "IN" | "US" | "ALL" }): Promise<ActionResult> {
  return apiAction("POST", "/api/v1/holidays", input, PAGES);
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/holidays/${encodeURIComponent(id)}`, undefined, PAGES);
}

import { apiCall, apiData, navigate } from "@/lib/api";
import { queryClient } from "@/lib/query";
import { fetchMe, CURRENT_USER_QUERY_KEY } from "@/lib/session";

import type { FormState } from "./form-state";

// Sign-in flows run in the Spring Boot API (/api/auth/*): rate limits, lockout, login history, audit and the
// session cookie (set by the API on the response; the browser keeps it). Signing in creates the session resource,
// signing out deletes it.

/** Forget everything fetched for the previous session, then go to `to`. */
function leave(to: string) {
  queryClient.clear();
  navigate(to);
}

/** After sign-in: load who the user is and the shell (menu, notifications) first, so the page appears complete. */
async function enter(to: string) {
  queryClient.clear();
  await Promise.all([
    queryClient.fetchQuery({ queryKey: CURRENT_USER_QUERY_KEY, queryFn: fetchMe }),
    queryClient.prefetchQuery({ queryKey: ["api", "/api/shell"], queryFn: () => apiData("/api/shell") }),
  ]);
  navigate(to);
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const identifier = String(form.get("identifier") ?? "");
  const r = await apiCall<{ redirect: string }>("POST", "/api/auth/session", {
    identifier,
    otp: String(form.get("otp") ?? ""),
    remember: form.get("remember") === "on",
    next: String(form.get("next") ?? ""),
  });
  if (!r.body.ok) return { error: r.body.error, identifier: identifier.slice(0, 200) };
  await enter(r.body.data!.redirect);
  return { ok: r.body.msg, identifier: identifier.slice(0, 200) };
}

/** Step 1 of the emailed-code sign-in: asks the API to email a 6-digit code. */
export async function requestOtpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("identifier") ?? "");
  const r = await apiCall("POST", "/api/auth/otp-requests", { email });
  return r.body.ok ? { ok: r.body.msg, identifier: email.slice(0, 200) } : { error: r.body.error, identifier: email.slice(0, 200) };
}

export async function logoutAction() {
  await apiCall("DELETE", "/api/auth/session"); // the API clears the access and refresh cookies
  leave("/login?signedout=1");
}


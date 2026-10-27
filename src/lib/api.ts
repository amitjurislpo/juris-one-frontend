import { queryClient } from "./query";
import { readLang } from "./i18n/lang";
import { translate } from "./i18n/translate";

/** Client for the Spring Boot API. The browser talks to its own origin; `/api/*` is proxied to the API (vite.config.ts). */
/** `errors` (field path → message) comes with a 422 on a form save. */
export type ApiResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; error: string; errors?: Record<string, string> };

export interface ApiResponse<T> {
  status: number;
  body: ApiResult<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Where to go when the session has ended (set by the app once the router exists). */
let navigateTo: (destination: string) => void = (destination) => window.location.assign(destination);
export const setNavigator = (fn: (destination: string) => void) => { navigateTo = fn; };
/** Client-side navigation from outside React (after sign-in / sign-out). */
export const navigate = (to: string) => navigateTo(to);

/** Reloads "who am I?" (so the locked state is known) and opens the onboarding page, unless the user is already on one. */
function sendToOnboarding() {
  if (location.pathname.startsWith("/onboarding")) return;
  void queryClient.invalidateQueries();
  navigateTo("/onboarding");
}

const PUBLIC = ["/login"];
const onPublicPage = () => PUBLIC.some((p) => location.pathname === p || location.pathname.startsWith(p));

let refreshing: Promise<boolean> | null = null;
/** Exchanges the refresh cookie for new session cookies; one call at a time. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/session-refreshes", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: "{}",
    credentials: "same-origin",
  })
    // read the body to the end: an unread response keeps the request "in flight" in the browser
    .then(async (r) => { await r.text().catch(() => ""); return r.ok; })
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function send<T>(method: string, path: string, body: unknown, file?: Blob | FormData): Promise<ApiResponse<T>> {
  const write = method !== "GET";
  const isForm = file instanceof FormData;
  const res = await fetch(path, {
    method,
    // a multipart form sets its own content type (with the boundary)
    headers: isForm ? { accept: "application/json" } : file ? { accept: "application/json", "content-type": file.type } : write ? { accept: "application/json", "content-type": "application/json" } : { accept: "application/json" },
    body: file ?? (write ? JSON.stringify(body ?? {}) : undefined),
    credentials: "same-origin",
    cache: "no-store",
  });
  let parsed: ApiResult<T>;
  try {
    const json = await res.json();
    // the API refuses everything but onboarding to an employee whose onboarding is not approved yet (403 problem "onboarding-pending")
    if (res.status === 403 && /onboarding-pending/.test(`${json?.code ?? ""} ${json?.type ?? ""} ${json?.detail ?? ""}`)) sendToOnboarding();
    // errors arrive as RFC 7807 problem details: { status, code, detail, ... }
    // a 2xx answer without the envelope (the onboarding endpoints may answer with the bare payload) is the data itself
    parsed = typeof json?.ok === "boolean" ? (json as ApiResult<T>) : res.ok ? { ok: true, data: json as T } : { ok: false, error: String(json?.detail ?? "Something went wrong. Please try again."), errors: json?.errors && typeof json.errors === "object" ? (json.errors as Record<string, string>) : undefined };
  } catch {
    parsed = res.ok ? { ok: true } : { ok: false, error: "Something went wrong. Please try again." };
  }
  // the API speaks English; show its fixed messages in the reader's language (unknown or dynamic ones stay English)
  const lang = readLang();
  if (!parsed.ok) parsed = { ...parsed, error: translate(lang, parsed.error) };
  else if (parsed.message) parsed = { ...parsed, message: translate(lang, parsed.message) };
  return { status: res.status, body: parsed };
}

/**
 * One API call. A 401 triggers one silent session refresh and a retry; if that fails the session has ended and the user
 * is sent to the sign-in page (unless `quiet`, used when asking "who am I?" on a public page).
 */
export async function apiCall<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown, opts: { quiet?: boolean; file?: Blob | FormData } = {}): Promise<ApiResponse<T>> {
  let response = await send<T>(method, path, body, opts.file);
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    if (await refreshSession()) response = await send<T>(method, path, body, opts.file);
    if (response.status === 401 && !opts.quiet && !onPublicPage()) {
      queryClient.clear();
      const next = location.pathname + location.search;
      navigateTo(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
    }
  }
  // a policy was published since the page was loaded: reload "who am I?" so the acknowledgement screen takes over
  if (response.status === 428) void queryClient.invalidateQueries();
  return response;
}

/** Tells the audit log that this page was opened. Fire and forget: no redirect on 401, no refetch, errors ignored. */
export function reportPageView(path: string) {
  fetch("/api/audit/page-views", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ path }),
    credentials: "same-origin",
    keepalive: true,
  }).then((r) => r.text()).catch(() => {});
}

/** GET returning `data`, or null on 401 (signed out). Other errors throw. */
export async function apiGet<T>(path: string): Promise<T | null> {
  const response = await apiCall<T>("GET", path, undefined, { quiet: true });
  if (response.status === 401) return null;
  if (!response.body.ok) throw new ApiError(response.body.error, response.status);
  return response.body.data as T;
}

/** GET returning `data`; throws an ApiError on any error. */
export async function apiData<T>(path: string): Promise<T> {
  const response = await apiCall<T>("GET", path);
  if (!response.body.ok) throw new ApiError(response.body.error, response.status);
  return response.body.data as T;
}

/**
 * A write: returns the API's `{ ok, message?, data?, error? }` envelope unchanged. On success every cached page is refetched before this resolves
 * (the old `revalidate` page list is accepted and ignored, so action files read as before).
 */
export async function apiAction<T = undefined>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown, _revalidate: string[] = []): Promise<ApiResult<T>> {
  const response = await apiCall<T>(method, path, body);
  // wait for the refetch: the caller shows its toast together with the fresh data (what revalidatePath did)
  if (response.body.ok) await queryClient.invalidateQueries();
  return response.body;
}

/** A write whose body is a file (raw bytes, e.g. a photo) or nothing (a DELETE). Like apiAction, every page's data is refetched on success. */
export async function apiFile(method: "PUT" | "DELETE", path: string, file?: Blob): Promise<ApiResult<undefined>> {
  const response = await apiCall<undefined>(method, path, undefined, { file });
  if (response.body.ok) await queryClient.invalidateQueries();
  return response.body;
}

/** A multipart upload (`POST`, e.g. a task attachment): same envelope, 401 refresh and refetch as apiAction. */
export async function apiUpload<T = undefined>(path: string, formData: FormData): Promise<ApiResult<T>> {
  const response = await apiCall<T>("POST", path, undefined, { file: formData });
  if (response.body.ok) await queryClient.invalidateQueries();
  return response.body;
}

/** Search params → query string (first value of each). */
export function toQueryString(searchParams: Record<string, string | string[] | undefined>): string {
  const queryParameters = new URLSearchParams();
  for (const [parameterName, parameterValue] of Object.entries(searchParams)) {
    const firstValue = Array.isArray(parameterValue) ? parameterValue[0] : parameterValue;
    if (firstValue !== undefined) queryParameters.set(parameterName, firstValue);
  }
  const queryString = queryParameters.toString();
  return queryString ? `?${queryString}` : "";
}

import { queryClient } from "./query";
import { readLang } from "./i18n/lang";
import { translate } from "./i18n/translate";

/** Client for the Spring Boot API. The browser talks to its own origin; `/api/*` is proxied to the API (vite.config.ts). */
export type ApiResult<T = undefined> = { ok: true; msg?: string; data?: T } | { ok: false; error: string };

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
let navigateTo: (to: string) => void = (to) => window.location.assign(to);
export const setNavigator = (fn: (to: string) => void) => { navigateTo = fn; };
/** Client-side navigation from outside React (after sign-in / sign-out). */
export const navigate = (to: string) => navigateTo(to);

const PUBLIC = ["/login", "/forgot", "/invite/", "/reset/", "/onboard/"];
const onPublicPage = () => PUBLIC.some((p) => location.pathname === p || location.pathname.startsWith(p));

let refreshing: Promise<boolean> | null = null;
/** Exchanges the refresh cookie for new session cookies; one call at a time. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/session/refresh", {
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

async function send<T>(method: string, path: string, body: unknown): Promise<ApiResponse<T>> {
  const write = method !== "GET";
  const res = await fetch(path, {
    method,
    headers: write ? { accept: "application/json", "content-type": "application/json" } : { accept: "application/json" },
    body: write ? JSON.stringify(body ?? {}) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  let parsed: ApiResult<T>;
  try {
    const json = await res.json();
    // errors arrive as RFC 7807 problem details: { status, code, detail, ... }
    parsed = typeof json?.ok === "boolean" ? (json as ApiResult<T>) : { ok: false, error: String(json?.detail ?? "Something went wrong. Please try again.") };
  } catch {
    parsed = { ok: false, error: "Something went wrong. Please try again." };
  }
  // the API speaks English; show its fixed messages in the reader's language (unknown or dynamic ones stay English)
  const lang = readLang();
  if (!parsed.ok) parsed = { ...parsed, error: translate(lang, parsed.error) };
  else if (parsed.msg) parsed = { ...parsed, msg: translate(lang, parsed.msg) };
  return { status: res.status, body: parsed };
}

/**
 * One API call. A 401 triggers one silent session refresh and a retry; if that fails the session has ended and the user
 * is sent to the sign-in page (unless `quiet`, used when asking "who am I?" on a public page).
 */
export async function apiCall<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown, opts: { quiet?: boolean } = {}): Promise<ApiResponse<T>> {
  let r = await send<T>(method, path, body);
  if (r.status === 401 && !path.startsWith("/api/auth/")) {
    if (await refreshSession()) r = await send<T>(method, path, body);
    if (r.status === 401 && !opts.quiet && !onPublicPage()) {
      queryClient.clear();
      const next = location.pathname + location.search;
      navigateTo(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
    }
  }
  return r;
}

/** GET returning `data`, or null on 401 (signed out). Other errors throw. */
export async function apiGet<T>(path: string): Promise<T | null> {
  const r = await apiCall<T>("GET", path, undefined, { quiet: true });
  if (r.status === 401) return null;
  if (!r.body.ok) throw new ApiError(r.body.error, r.status);
  return r.body.data as T;
}

/** GET returning `data`; throws an ApiError on any error. */
export async function apiData<T>(path: string): Promise<T> {
  const r = await apiCall<T>("GET", path);
  if (!r.body.ok) throw new ApiError(r.body.error, r.status);
  return r.body.data as T;
}

/**
 * A write: returns the API's `{ ok, msg?, data?, error? }` envelope unchanged. On success every cached page is refetched before this resolves
 * (the old `revalidate` page list is accepted and ignored, so action files read as before).
 */
export async function apiAction<T = undefined>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown, _revalidate: string[] = []): Promise<ApiResult<T>> {
  const r = await apiCall<T>(method, path, body);
  // wait for the refetch: the caller shows its toast together with the fresh data (what revalidatePath did)
  if (r.body.ok) await queryClient.invalidateQueries();
  return r.body;
}

/** Search params → query string (first value of each). */
export function qs(sp: Record<string, string | string[] | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const x = Array.isArray(v) ? v[0] : v;
    if (x !== undefined) p.set(k, x);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

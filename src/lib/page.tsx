import { useSuspenseQuery } from "@tanstack/react-query";
import { Component, createContext, useContext, useMemo, type ErrorInfo, type ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router";
import { ApiError, apiData } from "./api";
import { useT } from "./i18n/client";
import type { T } from "./i18n/translate";
import { NAV, navAllowed, type NavId } from "./nav";
import { useSearchRecord } from "./router";
import { landingPath, useCurrentUser, type CurrentUser } from "./session";

/**
 * What a page needs. Replaces the Next.js server-page preamble:
 *   const u = await requirePage("leave"); const t = await getT(); const sp = await props.searchParams;
 * with   const { u, t, sp, params } = usePage();   (the route already checked access, see RequirePage)
 */
export interface PageCtx {
  u: CurrentUser;
  t: T;
  /** URL search params, first value of each. */
  sp: Record<string, string>;
  /** Route params (`/platform/:id` → { id }). */
  params: Record<string, string>;
}

const Ctx = createContext<PageCtx | null>(null);

export function usePage(): PageCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePage() outside a page route");
  return c;
}

/**
 * One GET against the API, cached and refetched after any write. The first load suspends (the layout shows a loading
 * state); when a filter or sort changes inside a transition (see components/table/useQuery) the previous rows stay on
 * screen and the URL changes only once the new rows are ready, like a server-rendered page. `path` null means "not yet"
 * and gives `undefined`. Errors go to the page's error boundary.
 */
export function useData<T>(path: string | null): T | undefined {
  const q = useSuspenseQuery({
    queryKey: ["api", path],
    queryFn: async () => (path === null ? null : await apiData<T>(path)),
  });
  return (q.data ?? undefined) as T | undefined;
}

/** Shown while a page's data first loads. */
export function PageLoading() {
  return <div className="empty" role="status" aria-busy="true"><span className="muted">…</span></div>;
}

export function NotFound() {
  const t = useT();
  return (
    <div className="empty">
      <b className="display">{t("Page not found")}</b>
      <span className="muted">{t("This page doesn't exist, or isn't available for your business.")}</span>
    </div>
  );
}

/** Pages that stay open when the business's subscription isn't active (the API allows the same). */
const OPEN_WITHOUT_SUBSCRIPTION: NavId[] = ["subscription"];

/**
 * Route guard (was requirePage): the nav entry for this route must be allowed, else go to the user's landing page. When
 * the business's subscription isn't active every page except the owner's Subscription page shows the "paused" screen
 * instead; while a published policy waits for the user's acceptance every page shows the acknowledgement screen.
 * `id` is omitted for pages outside the nav (acknowledge, paused): they only need a signed-in user.
 */
export function RequirePage({ id, children }: { id?: NavId; children: ReactNode }) {
  const { user: u } = useCurrentUser();
  const t = useT();
  const loc = useLocation();
  const params = useParams();
  const sp = useSearchRecord();
  const ctx = useMemo<PageCtx | null>(() => (u ? { u, t, sp, params: params as Record<string, string> } : null), [u, t, sp, params]);
  if (!u || !ctx) return <Navigate to={`/login${loc.pathname !== "/" ? `?next=${encodeURIComponent(loc.pathname + loc.search)}` : ""}`} replace />;
  if (id) {
    const item = NAV.find((n) => n.id === id)!;
    if (item.module && !u.modules.includes(item.module)) return <NotFound />;
    if (!navAllowed(item, u.perms, u.hasReports)) return <Navigate to={landingPath(u)} replace />;
    if (u.subscriptionActive === false && !OPEN_WITHOUT_SUBSCRIPTION.includes(id)) return <Navigate to="/paused" replace />;
    if (u.pendingPolicies > 0) return <Navigate to="/acknowledge" replace />;
  }
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

/** Catches a page's failed data load (403/404 included) and offers a retry. Reset by navigation (key on the path). */
export class PageErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_e: Error, _i: ErrorInfo) {}
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const status = error instanceof ApiError ? error.status : 0;
    return (
      <div className="empty">
        <b className="display">{status === 403 ? "You don't have access to this" : status === 404 ? "Not found" : "Something went wrong"}</b>
        <span className="muted">{error.message}</span>
        <button className="btn btn-sm" onClick={() => { this.setState({ error: null }); this.props.onRetry(); }}>Retry</button>
      </div>
    );
  }
}

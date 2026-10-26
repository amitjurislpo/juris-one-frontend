import { useSuspenseQuery } from "@tanstack/react-query";
import { Component, createContext, useContext, useEffect, useMemo, type ErrorInfo, type ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router";
import { useToast } from "@/components/shell/Toasts";
import Link from "./link";
import { ApiError, apiData } from "./api";
import { useT } from "./i18n/client";
import type { T } from "./i18n/translate";
import { NAV, navAllowed, type NavId } from "./nav";
import { useSearchRecord } from "./router";
import { landingPath, useCurrentUser, type CurrentUser } from "./session";

/**
 * What a page needs. Replaces the old server-page preamble (checking access, loading the translator and the search params) with
 *   const { user, t, searchParams, params } = usePage();   (the route already checked access, see RequirePage)
 */
export interface PageContext {
  user: CurrentUser;
  t: T;
  /** URL search params, first value of each. */
  searchParams: Record<string, string>;
  /** Route params (`/platform/:id` → { id }). */
  params: Record<string, string>;
}

const Ctx = createContext<PageContext | null>(null);

export function usePage(): PageContext {
  const context = useContext(Ctx);
  if (!context) throw new Error("usePage() outside a page route");
  return context;
}

/**
 * One GET against the API, cached and refetched after any write. The first load suspends (the layout shows a loading
 * state); when a filter or sort changes inside a transition (see components/table/useQuery) the previous rows stay on
 * screen and the URL changes only once the new rows are ready, like a server-rendered page. `path` null means "not yet"
 * and gives `undefined`. Errors go to the page's error boundary.
 */
export function useData<T>(path: string | null): T | undefined {
  const query = useSuspenseQuery({
    queryKey: ["api", path],
    queryFn: async () => (path === null ? null : await apiData<T>(path)),
  });
  return (query.data ?? undefined) as T | undefined;
}

/** Shown while a page's data first loads. */
export function PageLoading() {
  return <div className="empty" role="status" aria-busy="true"><span className="muted">…</span></div>;
}

/** A page that doesn't exist (or isn't available to this business): centered, with a way home (to sign-in when nobody is signed in). */
export function NotFound() {
  const t = useT();
  const { user } = useCurrentUser();
  return (
    <div className={`empty not-found${user ? "" : " standalone"}`}>
      <b className="display">{t("Page not found")}</b>
      <span className="muted">{t("This page doesn't exist, or isn't available for your business.")}</span>
      {user ? <Link className="btn btn-sm" href="/">{t("Go to home")}</Link> : <Link className="btn btn-sm" href="/login">{t("Go to sign in")}</Link>}
    </div>
  );
}

/** Sends a signed-in user who opened a page they have no permission for to their landing page, saying why (not for a normal landing redirect). */
function DeniedRedirect({ to }: { to: string }) {
  const t = useT();
  const toast = useToast();
  useEffect(() => { toast(t("You don't have access to that page."), "bad"); }, [toast, t]);
  return <Navigate to={to} replace />;
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
  const { user } = useCurrentUser();
  const t = useT();
  const currentLocation = useLocation();
  const params = useParams();
  const searchParams = useSearchRecord();
  const ctx = useMemo<PageContext | null>(() => (user ? { user, t, searchParams, params: params as Record<string, string> } : null), [user, t, searchParams, params]);
  if (!user || !ctx) return <Navigate to={`/login${currentLocation.pathname !== "/" ? `?next=${encodeURIComponent(currentLocation.pathname + currentLocation.search)}` : ""}`} replace />;
  if (id) {
    const item = NAV.find((n) => n.id === id)!;
    if (item.module && !user.modules.includes(item.module)) return <NotFound />;
    if (!navAllowed(item, user.perms, user.hasReports)) return <DeniedRedirect to={landingPath(user)} />;
    if (user.subscriptionActive === false && !OPEN_WITHOUT_SUBSCRIPTION.includes(id)) return <Navigate to="/paused" replace />;
    if (user.pendingPolicies > 0 && !user.readOnly) return <Navigate to="/acknowledge" replace />;
  }
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

/** Catches a page's failed data load (403/404 included) and offers a retry (403/404: a way home instead, a retry would give the same answer). Reset by navigation (key on the path). */
export class PageErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_e: Error, _i: ErrorInfo) {}
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const status = error instanceof ApiError ? error.status : 0;
    return <PageError error={error} status={status} onRetry={() => { this.setState({ error: null }); this.props.onRetry(); }} />;
  }
}

function PageError({ error, status, onRetry }: { error: Error; status: number; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="empty">
      <b className="display">{status === 403 ? t("You don't have access to this") : status === 404 ? t("Not found") : t("Something went wrong")}</b>
      <span className="muted">{error.message}</span>
      {status === 403 || status === 404
        ? <Link className="btn btn-sm" href="/">{t("Go to home")}</Link> // trying again cannot change the answer: a missing or forbidden page stays so
        : <button className="btn btn-sm" onClick={onRetry}>{t("Retry")}</button>}
    </div>
  );
}

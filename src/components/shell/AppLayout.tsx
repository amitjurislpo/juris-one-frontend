import { Suspense, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import Link from "@/lib/link";
import { Shell } from "@/components/shell/Shell";
import type { ShellNote, SubscriptionCurrent } from "@/lib/api-types";
import { formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { BUSINESS_MANAGE, type NavGroup } from "@/lib/nav";
import { PageErrorBoundary, PageLoading, useData } from "@/lib/page";
import { reportPageView } from "@/lib/api";
import { refreshData } from "@/lib/query";
import { useCurrentUser } from "@/lib/session";
import { currentTheme } from "./theme";

interface ShellData {
  me: { code: string; name: string; designation: string; roleName: string; department: string; manager: string; dateOfJoining: string; shift: string | null; isAdminLike: boolean };
  groups: { title: NavGroup; items: { id: string; label: string; icon: string }[] }[];
  badges: { approvals: number; proofs: number };
  notes: ShellNote[];
  unread: number;
  landing: string;
  canSelf: boolean;
  businessName: string | null;
  subscription: SubscriptionCurrent | null;
}

/** Layout of every signed-in page: the shell (sidebar, top bar, notifications) around the page. */
export function AppLayout() {
  const { user, loading } = useCurrentUser();
  const loc = useLocation();
  const t = useT();
  const data = useData<ShellData>(user ? "/api/shell" : null);
  // every page opened by a signed-in user goes into the audit log (once per navigation)
  const signedIn = !!user;
  useEffect(() => { if (signedIn) reportPageView(loc.pathname); }, [signedIn, loc.pathname]);
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to={`/login${loc.pathname !== "/" ? `?next=${encodeURIComponent(loc.pathname + loc.search)}` : ""}`} replace />;
  if (!data) return <PageLoading />;
  // the owner is warned on every page during the last week of the subscription
  const s = data.subscription;
  const ending = s?.active && s.daysLeft !== null && s.daysLeft <= 7 && (user.perms as ReadonlySet<string>).has(BUSINESS_MANAGE);
  return (
    <Shell
      me={data.me}
      groups={data.groups}
      badges={data.badges}
      notes={data.notes}
      unread={data.unread}
      landing={data.landing}
      canSelf={data.canSelf}
      businessName={data.businessName}
      initialTheme={currentTheme()}
    >
      {user.readOnly && (
        <div className="card" role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 20, background: "var(--warnbg)", borderColor: "transparent", color: "var(--warn)" }}>
          <b style={{ flex: 1 }}>{t("Your JurisOne subscription has ended. You can view and export your data, but nothing can be changed until it is renewed. Contact the JurisOne team to renew.")}</b>
          {(user.perms as ReadonlySet<string>).has(BUSINESS_MANAGE) && <Link className="btn btn-sm" href="/subscription">{t("Subscription")}</Link>}
        </div>
      )}
      {ending && (
        <div className="card" role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 20, background: "var(--warnbg)", borderColor: "transparent", color: "var(--warn)" }}>
          <b style={{ flex: 1 }}>
            {s.daysLeft === 0 ? t("Your JurisOne subscription ends today") : s.daysLeft === 1 ? t("Your JurisOne subscription ends in 1 day") : t("Your JurisOne subscription ends in {n} days", { n: s.daysLeft ?? 0 })} ({formatDayMonthYear(s.endsOn!)}).
            {" "}{t("After that, everyone can still sign in but JurisOne is paused. Contact the JurisOne team to renew.")}
          </b>
          <Link className="btn btn-sm" href="/subscription">{t("Subscription")}</Link>
        </div>
      )}
      <PageErrorBoundary key={loc.pathname} onRetry={refreshData}>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </PageErrorBoundary>
    </Shell>
  );
}

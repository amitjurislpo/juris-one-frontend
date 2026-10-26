import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { PageLoading } from "@/lib/page";
import { TrackProvider, type TrackUser } from "@/track";
import { EMBEDDED_ROUTES, SUB_NAV } from "./embeddedRoutes";
import { MODULE_PATH, useTrackContext } from "./useTrackContext";

/** Gives the JurisTrack pages their context (JurisOne's cookie session through the gateway, language, router, toasts) and the module's tabs. */
export function TrackLayout({ trackUser }: { trackUser: TrackUser }) {
  const t = useT();
  const { pathname } = useLocation();
  const trackPath = pathname.slice(MODULE_PATH.length) || "/";
  const contextValue = useTrackContext(trackUser);

  const tabs = SUB_NAV.filter((tab) => EMBEDDED_ROUTES.some((route) => route.path === tab.path && route.roles.includes(trackUser.role)));
  // the longest matching tab wins (`team/reports` is the Reports tab, not Team)
  const activeTab = tabs.filter((tab) => trackPath === `/${tab.path}` || trackPath.startsWith(`/${tab.path}/`)).sort((first, second) => second.path.length - first.path.length)[0];
  return (
    <TrackProvider value={contextValue}>
      <nav className="seg track-tabs enter" aria-label="Juris Track" style={{ marginBottom: 20 }}>
        {tabs.map((tab) => (
          <Link key={tab.path} href={`${MODULE_PATH}/${tab.path}`} className={tab === activeTab ? "on" : undefined} aria-current={tab === activeTab ? "page" : undefined}>{t(tab.label)}</Link>
        ))}
      </nav>
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </TrackProvider>
  );
}

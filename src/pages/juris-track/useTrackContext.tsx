import { useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useToast } from "@/components/shell/Toasts";
import { useReadOnly } from "@/lib/session";
import { apiCall } from "@/lib/api";
import { useT, useLang } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { refreshData } from "@/lib/query";
import type { TrackContextValue, TrackLinkProps, TrackUser } from "@/track";

/** Where the JurisOne gateway forwards to JurisTrack (`/api/juris-track/<path>` is JurisTrack's `/api/<path>`), and where its pages are mounted in this app. */
export const GATEWAY_PATH = "/api/juris-track";
export const MODULE_PATH = "/juris-track";

const LOCALES = { en: "en-GB", hi: "hi-IN" } as const;

/** A link to a JurisTrack route (`/my-time`), drawn inside the module's address. */
function ModuleLink({ to, ...rest }: TrackLinkProps) {
  return <Link href={MODULE_PATH + to} {...rest} />;
}

/**
 * What JurisTrack's pages and components need from the host (JurisOne's cookie session through the gateway, language, router,
 * toasts). Used by the module's pages (TrackLayout) and by the Home screen's timer; give the result to `TrackProvider`.
 */
export function useTrackContext(trackUser: TrackUser): TrackContextValue {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const toast = useToast();
  const isReadOnly = useReadOnly();
  const { pathname, search } = useLocation();
  const params = useParams() as Record<string, string>;
  // one check at a time: a stale tab can fire several requests together
  const moduleCheck = useRef<Promise<string | null> | null>(null);
  const trackPath = pathname.startsWith(MODULE_PATH) ? pathname.slice(MODULE_PATH.length) || "/" : "/";
  return useMemo<TrackContextValue>(() => ({
    apiBasePath: GATEWAY_PATH,
    // JurisOne adds JurisTrack's token on the server
    getHeaders: () => ({}),
    user: trackUser,
    t,
    locale: LOCALES[lang],
    navigate: (to, options) => {
      if (typeof to === "number") void navigate(to);
      else void navigate(MODULE_PATH + to, { replace: options?.replace, preventScrollReset: options?.keepScroll });
    },
    location: { pathname: trackPath, search, params },
    readCurrentSearch: () => window.location.search,
    canGoBack: () => Boolean((window.history.state as { idx?: number } | null)?.idx),
    Link: ModuleLink,
    toast,
    isReadOnly,
    // the same rule as the Home greeting (JurisOne says "Working late" before 05:00)
    greetingFor: (hour) => (hour < 5 ? "Working late, {name}" : hour < 12 ? "Good morning, {name}" : hour < 17 ? "Good afternoon, {name}" : "Good evening, {name}"),
    // the JurisOne session is what counts: ask "who am I?" (this renews it, or sends the user to sign-in) and repeat the request if it is still valid
    onUnauthorized: async ({ isQuiet }) => (await apiCall("GET", "/api/me", undefined, { quiet: isQuiet })).status !== 401,
    onBusinessSuspended: () => { void refreshData(); },
    // a 404 from the gateway is either an ordinary missing record or the module being gone (revoked, plan changed): ask the module's own address
    onNotFound: () => {
      moduleCheck.current ??= apiCall("GET", GATEWAY_PATH, undefined, { quiet: true }).then((probe) => {
        if (probe.status !== 404) return null;
        const message = t("Juris Track is no longer available for your business.");
        toast(message, "bad");
        void navigate("/home");
        return message;
      }).finally(() => { moduleCheck.current = null; });
      return moduleCheck.current;
    },
  }), [trackUser, t, lang, navigate, toast, isReadOnly, trackPath, search, params]);
}

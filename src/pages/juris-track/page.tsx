import { Navigate, Route, Routes } from "react-router";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading, useData, usePage } from "@/lib/page";
import { homeFor, RequireRole, type TrackUser } from "@/track";
import { EMBEDDED_ROUTES } from "./embeddedRoutes";
import { TrackLayout } from "./TrackLayout";

/** What the user sees until the Juris Track service is switched on for this installation. */
function ComingSoon() {
  const { t } = usePage();
  return (
    <div className="col">
      <PageHeader eyebrow={t("Juris Track")} title={<>{t("Juris Track")}</>} sub={t("Included in your JurisOne subscription.")} />
      <section className="card enter" style={{ ["--i" as string]: 1, padding: "48px 28px", textAlign: "center" }}>
        <span style={{ width: 56, height: 56, margin: "0 auto 16px", background: "var(--accentsoft)", color: "var(--accent)", display: "grid", placeItems: "center", borderRadius: 14 }}>
          <Icon name="sparkle" size={26} />
        </span>
        <span className="chip gold nodot" style={{ marginBottom: 12 }}>{t("Coming soon")}</span>
        <h2 className="display" style={{ fontSize: 34, margin: "0 0 10px" }}>{t("Something new is on its way")}</h2>
        <p className="muted" style={{ maxWidth: 520, margin: "0 auto" }}>
          {t("Juris Track is being built and will appear right here. Your business already has access, so there's nothing to set up: you'll be able to use it as soon as it launches.")}
        </p>
      </section>
    </div>
  );
}

/** The JurisTrack pages, once its user is known (the role decides which of them open). */
function ActiveModule() {
  const trackUser = useData<TrackUser>("/api/juris-track/me");
  if (!trackUser) return <PageLoading />;
  return (
    <Routes>
      <Route element={<TrackLayout trackUser={trackUser} />}>
        <Route index element={<Navigate to={homeFor(trackUser.role) === "/team" ? "team" : "dashboard"} replace />} />
        {EMBEDDED_ROUTES.map(({ path, roles, Page }) => (
          <Route key={path} path={path} element={<RequireRole roles={roles}><Page /></RequireRole>} />
        ))}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}

/**
 * Juris Track inside JurisOne (`/juris-track/*`): only for businesses with the module (plan or grant), everyone else gets a 404
 * (see RequirePage). The pages are JurisTrack's own, talking to it through the JurisOne gateway (`/api/juris-track`).
 */
export default function JurisTrackPage() {
  const jurisTrack = useData<{ module: string; status: string }>("/api/juris-track");
  if (!jurisTrack) return <PageLoading />;
  return jurisTrack.status === "ACTIVE" ? <ActiveModule /> : <ComingSoon />;
}

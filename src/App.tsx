import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import { AppLayout } from "@/components/shell/AppLayout";
import { setNavigator } from "@/lib/api";
import { I18nProvider } from "@/lib/i18n/client";
import { NotFound, PageLoading, RequirePage } from "@/lib/page";
import { queryClient } from "@/lib/query";
import { landingPath, useCurrentUser } from "@/lib/session";
import { APP_ROUTES, PUBLIC_ROUTES } from "./routes";

/** Page title: "<page> · JurisOne" (the tab title the Next.js app got from `metadata`). */
function Titled({ title, children }: { title: string; children: React.ReactNode }) {
  useEffect(() => { document.title = `${title} · JurisOne`; }, [title]);
  return children;
}

/** `/` goes to the user's landing page, or to sign-in. */
function Root() {
  const { user, loading } = useCurrentUser();
  if (loading) return <PageLoading />;
  return <Navigate to={user ? landingPath(user) : "/login"} replace />;
}

/** Hands the router's navigate to the API client, so "session ended" can move the user to /login. */
function NavigatorBridge() {
  const navigate = useNavigate();
  useEffect(() => { setNavigator((to) => navigate(to, { replace: true })); }, [navigate]);
  return null;
}

/** An unknown address: inside the app shell when signed in, on its own (with a link to sign-in) when not. */
function UnknownPage() {
  const { user, loading } = useCurrentUser();
  if (loading) return <PageLoading />;
  return user ? <AppLayout><NotFound /></AppLayout> : <NotFound />;
}

/** Old links: the People pages were renamed Employees. */
function Legacy() {
  const loc = useLocation();
  return <Navigate to={loc.pathname.replace(/^\/people/, "/employees") + loc.search} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <NavigatorBridge />
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Root />} />
              {PUBLIC_ROUTES.map(({ path, title, Page }) => (
                <Route key={path} path={path} element={<Titled title={title}><Page /></Titled>} />
              ))}
              <Route element={<AppLayout />}>
                {APP_ROUTES.map(({ path, title, nav, Page }) => (
                  <Route key={path} path={path} element={<Titled title={title}><RequirePage id={nav}><Page /></RequirePage></Titled>} />
                ))}
              </Route>
              <Route path="/people/*" element={<Legacy />} />
              <Route path="*" element={<UnknownPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
}

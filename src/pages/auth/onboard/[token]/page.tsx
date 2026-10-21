import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { apiCall } from "@/lib/api";
import { useT } from "@/lib/i18n/client";
import type { CandidateForm } from "../actions";
import { CandidateClient, type CandidateView } from "./CandidateClient";


/** The candidate's onboarding form, reached through the one-time link HR emailed to their personal address. */
export default function OnboardPage() {
  const { token = "" } = useParams();
  const t = useT();
  const q = useQuery({
    queryKey: ["api", "onboard", token],
    queryFn: () => apiCall<CandidateView & { form: CandidateForm }>("GET", `/api/public/onboardings/${encodeURIComponent(token)}`),
  });
  if (!q.data) return <main style={{ minHeight: "100vh", background: "var(--bg)" }} aria-busy="true" />;
  const r = q.data;
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 16px 64px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div className="brandmark" style={{ marginBottom: 22 }}><span className="monogram">J</span>JurisOne</div>
        {r.body.ok ? <CandidateClient token={token} v={r.body.data!} /> : (
          <section className="card" style={{ padding: 28, textAlign: "center" }}>
            <h1 className="display" style={{ fontSize: 30, margin: "0 0 8px" }}>{t("This link can't be used")}</h1>
            <p className="muted">{r.body.error}</p>
          </section>
        )}
      </div>
    </main>
  );
}

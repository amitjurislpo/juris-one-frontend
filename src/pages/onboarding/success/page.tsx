import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import { PageLoading, useData } from "@/lib/page";
import { useRouter } from "@/lib/router";
import { logoutAction } from "@/pages/auth/actions";
import { MINE, onboardingApiFor } from "../actions";
import { firstNameUpper } from "../summaryFormat";
import type { OnboardingView } from "../types";

/** Route `/onboarding/success`: shown after a successful submission. The employee stays locked until HR approves, so there is no way to the dashboard. */
export default function OnboardingSuccessPage() {
  const t = useT();
  const router = useRouter();
  const view = useData<OnboardingView>(onboardingApiFor(MINE).viewPath);
  if (!view) return <PageLoading />;
  return (
    <div className="empty" style={{ gap: 14, textAlign: "center", padding: "60px 16px" }}>
      <Icon name="check" size={48} />
      <h1 className="display">{t("Well Done")} {firstNameUpper(view.header.name)}</h1>
      <p className="muted" style={{ maxWidth: 520 }}>{t("Submitted. HR will review your details; you will get access once they approve.")}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" className="btn btn-gold btn-lg" onClick={() => router.push("/onboarding")}>{t("Back to status")}</button>
        <button type="button" className="btn btn-lg" onClick={() => void logoutAction()}>{t("Sign out")}</button>
      </div>
    </div>
  );
}

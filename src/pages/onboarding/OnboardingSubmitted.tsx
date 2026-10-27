import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import { MINE } from "./actions";
import { OnboardingSummaryScreen } from "./OnboardingSummaryScreen";
import type { OnboardingView } from "./types";

/** The employee's onboarding while it waits for HR: a status line and the Summary, with nothing to edit or submit. */
export function OnboardingSubmitted({ view }: { view: OnboardingView }) {
  const t = useT();
  return (
    <div className="onboarding">
      <p className="notice" role="status" style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="clock" size={16} /> <b>{t("Your onboarding is submitted and waiting for HR review")}</b></p>
      <OnboardingSummaryScreen view={view} target={MINE} canEdit={false} />
    </div>
  );
}

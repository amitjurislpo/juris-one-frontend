import { Navigate } from "react-router";
import { mustCompleteOnboarding } from "@/lib/onboarding-gate";
import { PageLoading, useData, usePage } from "@/lib/page";
import { MINE, onboardingApiFor } from "./actions";
import { OnboardingSubmitted } from "./OnboardingSubmitted";
import { OnboardingWizard } from "./OnboardingWizard";
import type { OnboardingView } from "./types";

/**
 * Route `/onboarding`: the employee's own onboarding. The wizard while it is open (not started, in progress, or sent back by HR),
 * the read-only "waiting for HR" page once submitted. Someone who is not locked (approved, or never required) has nothing to do here.
 */
export default function OnboardingPage() {
  const { user } = usePage();
  const isLocked = mustCompleteOnboarding(user.onboarding);
  const view = useData<OnboardingView>(isLocked ? onboardingApiFor(MINE).viewPath : null);
  if (!isLocked) return <Navigate to="/" replace />;
  if (!view) return <PageLoading />;
  if (view.status === "SUBMITTED") return <OnboardingSubmitted view={view} />;
  return <OnboardingWizard view={view} />;
}

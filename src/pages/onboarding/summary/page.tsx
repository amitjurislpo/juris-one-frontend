import { MINE, onboardingApiFor, type OnboardingTarget } from "../actions";
import { OnboardingSummaryScreen } from "../OnboardingSummaryScreen";
import { PageLoading, useData } from "@/lib/page";
import type { OnboardingView } from "../types";
import { canEditOnboarding } from "../wizardLogic";

/** Route `/onboarding/summary` (or HR's `/onboarding/hires/:employeeId/summary` with a `target`): the Information Summary. */
export default function OnboardingSummaryPage({ target = MINE }: { target?: OnboardingTarget }) {
  const view = useData<OnboardingView>(onboardingApiFor(target).viewPath);
  if (!view) return <PageLoading />;
  return <OnboardingSummaryScreen view={view} target={target} canEdit={canEditOnboarding(view, target)} />;
}

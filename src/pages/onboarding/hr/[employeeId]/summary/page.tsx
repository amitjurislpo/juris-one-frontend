import { PageLoading, useData, usePage } from "@/lib/page";
import { onboardingApiFor, type OnboardingTarget } from "../../../actions";
import type { OnboardingView } from "../../../types";
import OnboardingSummaryPage from "../../../summary/page";
import { ReviewPanel } from "../../ReviewPanel";

/** Route `/onboarding/hires/:employeeId/summary`: the Information Summary of an onboarding, with HR's review panel (Approve / Request changes) beside it. */
export default function HireSummaryPage() {
  const { params } = usePage();
  const target: OnboardingTarget = { kind: "hr", employeeId: params.employeeId };
  const api = onboardingApiFor(target);
  const view = useData<OnboardingView>(api.viewPath);
  if (!view) return <PageLoading />;
  return (
    <div className="hire-layout">
      <div className="hire-wizard"><OnboardingSummaryPage target={target} /></div>
      <ReviewPanel employeeId={params.employeeId} view={view} api={api} />
    </div>
  );
}

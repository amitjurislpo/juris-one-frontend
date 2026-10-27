import { PageLoading, useData, usePage } from "@/lib/page";
import { onboardingApiFor, type OnboardingTarget } from "../../actions";
import { OnboardingWizard } from "../../OnboardingWizard";
import type { OnboardingView } from "../../types";
import { ReviewPanel } from "../ReviewPanel";

/** Route `/onboarding/hires/:employeeId`: the employee's wizard filled on their behalf, next to HR's review panel. */
export default function HireOnboardingPage() {
  const { params } = usePage();
  const target: OnboardingTarget = { kind: "hr", employeeId: params.employeeId };
  const api = onboardingApiFor(target);
  const view = useData<OnboardingView>(api.viewPath);
  if (!view) return <PageLoading />;
  // the API marks every HR read as read-only; HR may edit in every status except APPROVED
  const editableView: OnboardingView = { ...view, isReadOnly: view.status === "APPROVED" || view.status === "NOT_REQUIRED" };
  return (
    <div className="hire-layout">
      <div className="hire-wizard"><OnboardingWizard view={editableView} target={target} /></div>
      <ReviewPanel employeeId={params.employeeId} view={view} api={api} />
    </div>
  );
}

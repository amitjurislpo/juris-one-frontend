import { useT } from "@/lib/i18n/client";
import { hireStatusChip, hireStatusLabel } from "@/pages/onboarding/hr/hireStatus";

/** The onboarding status of a person; a dash for people who never had to onboard. */
export function OnboardingStatusChip({ status }: { status: string | null | undefined }) {
  const t = useT();
  const label = hireStatusLabel(status);
  if (!label) return <span className="faint">-</span>;
  return <span className={`chip ${hireStatusChip(status)}`}>{t(label)}</span>;
}

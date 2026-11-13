import { PageHeader } from "@/components/PageHeader";
import type { LeavePolicy } from "@/lib/api-types";
import { usePage } from "@/lib/page";
import { LeaveYearForm } from "./LeaveYearForm";
import { YearEndChoice } from "./YearEndChoice";

/** The leave year and the year-end choice per leave type (Admin and HR). */
export function LeavePolicyClient({ policy }: { policy: LeavePolicy }) {
  const { t } = usePage();
  return (
    <div className="col">
      <PageHeader eyebrow={t("People ops")} title={t("Leave policy")} sub={t("When the leave year starts, and what happens to each leave balance when it ends.")} />
      <LeaveYearForm key={`${policy.year.startMonth}-${policy.year.startDay}`} year={policy.year} />
      {policy.types.map((type) => <YearEndChoice key={`${type.code}-${type.yearEndAction}-${type.carryForwardCap}`} type={type} />)}
    </div>
  );
}

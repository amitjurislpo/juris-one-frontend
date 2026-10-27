import { useState } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pager, Pending, SearchBox, SegmentedFilter } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { HIRE_STATUSES, hireStatusLabel, hiresPath, normalizeHires } from "./hireStatus";
import { HiresTable } from "./HiresTable";
import { OnboardHireDialog } from "./OnboardHireDialog";

/** Route `/onboarding/hires`: HR's list of onboardings, and the "Onboard employee" button. */
export default function HiresPage() {
  const { t, searchParams } = usePage();
  const isReadOnly = useReadOnly();
  const [isOnboarding, setIsOnboarding] = useState(false);
  const data = useData<unknown>(hiresPath(searchParams));
  if (!data) return <PageLoading />;
  const { rows, total, page, take } = normalizeHires(data);
  return (
    <div className="col">
      <PageHeader eyebrow={t("People operations")} title={t("Onboard")} emphasis={t("employees")} sub={t("Invite new hires, fill their onboarding with them and approve it.")}>
        {!isReadOnly && <button type="button" className="btn btn-gold btn-lg" onClick={() => setIsOnboarding(true)}><Icon name="plus" size={16} />{t("Onboard employee")}</button>}
      </PageHeader>
      <div className="toolbar">
        <SearchBox placeholder={t("Search name, ID, email")} label={t("Search onboardings")} />
        <SegmentedFilter name="status" label={t("Status")} dflt="All"
          options={[{ value: "All", label: t("All") }, ...HIRE_STATUSES.map((status) => ({ value: status, label: t(hireStatusLabel(status)!) }))]} />
        <span className="tcount">{t("{total} shown", { total })}</span>
      </div>
      <section className="card">
        <Pending>
          <HiresTable rows={rows} />
          <Pager page={page} take={take} total={total} />
        </Pending>
      </section>
      {isOnboarding && <OnboardHireDialog onClose={() => setIsOnboarding(false)} />}
    </div>
  );
}

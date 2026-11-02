import { PageHeader } from "@/components/PageHeader";
import { SegmentedFilter } from "@/components/table/Table";
import { usePage } from "@/lib/page";
import { AttendanceSummary } from "./AttendanceSummary";
import { RegularizationTab } from "./RegularizationTab";

/** Attendance: the summary (calendar) and the regularization requests, as tabs kept in the URL (?tab=regularization). */
export default function AttendancePage() {
  const { t, searchParams } = usePage();
  const tab = searchParams.tab === "regularization" ? "regularization" : "summary";
  return (
    <div className="col" style={{ gap: 24 }}>
      <div className="toolbar enter">
        <SegmentedFilter name="tab" dflt="summary" label={t("Attendance sections")} options={[{ value: "summary", label: t("Attendance summary") }, { value: "regularization", label: t("Regularization") }]} />
      </div>
      {tab === "regularization"
        ? <><PageHeader eyebrow={t("Attendance")} title={t("Regularization")} emphasis={t("requests")} sub={t("Ask for the real check-in and check-out of a day. Admin and HR decide.")} /><RegularizationTab /></>
        : <AttendanceSummary />}
    </div>
  );
}

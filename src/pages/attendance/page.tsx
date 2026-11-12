import { PageHeader } from "@/components/PageHeader";
import { SegmentedFilter } from "@/components/table/Table";
import { usePage } from "@/lib/page";
import { AttendanceScopeToggle } from "./AttendanceScopeToggle";
import { AttendanceSummary } from "./AttendanceSummary";
import { AttendanceTeam } from "./AttendanceTeam";
import { OnDutyTab } from "./OnDutyTab";
import { RegularizationTab } from "./RegularizationTab";

/** Attendance: the summary (calendar) and the regularization requests, as tabs kept in the URL (?tab=regularization); the summary also has a Team view (?scope=team). */
export default function AttendancePage() {
  const { t, user, searchParams } = usePage();
  const tab = searchParams.tab === "regularization" ? "regularization" : searchParams.tab === "on-duty" ? "on-duty" : "summary";
  const canSeeTeam = user.perms.has("att.all") || user.hasReports;
  const showTeam = tab === "summary" && canSeeTeam && searchParams.scope === "team";
  return (
    <div className="col" style={{ gap: 24 }}>
      <div className="toolbar enter">
        <SegmentedFilter name="tab" dflt="summary" label={t("Attendance sections")} options={[{ value: "summary", label: t("Attendance summary") }, { value: "regularization", label: t("Regularization") }, { value: "on-duty", label: t("On Duty") }]} />
        {tab === "summary" && canSeeTeam && <AttendanceScopeToggle />}
      </div>
      {tab === "on-duty"
        ? <><PageHeader eyebrow={t("Attendance")} title={t("On Duty")} emphasis={t("requests")} sub={t("Official work away from the usual place. An approved On Duty day counts as a present, payable day.")} /><OnDutyTab /></>
        : tab === "regularization"
        ? <><PageHeader eyebrow={t("Attendance")} title={t("Regularization")} emphasis={t("requests")} sub={t("Ask for the real check-in and check-out of a day. Admin and HR decide.")} /><RegularizationTab /></>
        : showTeam ? <AttendanceTeam /> : <AttendanceSummary />}
    </div>
  );
}

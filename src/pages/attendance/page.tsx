import { PageHeader } from "@/components/PageHeader";
import { SegmentedFilter } from "@/components/table/Table";
import { usePage } from "@/lib/page";
import { AttendanceScopeToggle } from "./AttendanceScopeToggle";
import { AttendanceSummary } from "./AttendanceSummary";
import { AttendanceTeam } from "./AttendanceTeam";
import { OnDutyTab } from "./OnDutyTab";
import { usePendingCounts, withPendingCount } from "./pendingCounts";
import { RegularizationTab } from "./RegularizationTab";
import { RemoteWorkTab } from "./RemoteWorkTab";
import { ShiftTab } from "./ShiftTab";

/** Attendance: the summary (calendar) and the regularization requests, as tabs kept in the URL (?tab=regularization); the summary also has a Team view (?scope=team). */
export default function AttendancePage() {
  const { t, user, searchParams } = usePage();
  const tab = searchParams.tab === "regularization" ? "regularization" : searchParams.tab === "on-duty" ? "on-duty" : searchParams.tab === "remote-work" ? "remote-work" : searchParams.tab === "shift" ? "shift" : "summary";
  const counts = usePendingCounts(); // waiting for this user to decide, by the server's approval rule
  const canSeeTeam = user.perms.has("att.all") || user.hasReports;
  const showTeam = tab === "summary" && canSeeTeam && searchParams.scope === "team";
  return (
    <div className="col" style={{ gap: 24 }}>
      <div className="toolbar enter">
        <SegmentedFilter name="tab" dflt="summary" label={t("Attendance sections")} options={[{ value: "summary", label: t("Attendance summary") }, { value: "regularization", label: withPendingCount(t("Regularization"), counts?.regularization) }, { value: "on-duty", label: withPendingCount(t("On Duty"), counts?.onDuty) }, { value: "remote-work", label: withPendingCount(t("Remote Work Requests"), counts?.remoteWork) }, { value: "shift", label: t("Shift") }]} />
        {tab === "summary" && canSeeTeam && <AttendanceScopeToggle />}
      </div>
      {tab === "shift"
        ? <><PageHeader eyebrow={t("Attendance")} title={t("Shift")} emphasis={t("roster")} sub={t("Who works which shift, day by day.")} /><ShiftTab /></>
        : tab === "remote-work"
        ? <><PageHeader eyebrow={t("Attendance")} title={t("Remote work")} emphasis={t("requests")} sub={t("Ask to work from home for a day or more. Admin and HR decide.")} /><RemoteWorkTab /></>
        : tab === "on-duty"
        ? <><PageHeader eyebrow={t("Attendance")} title={t("On Duty")} emphasis={t("requests")} sub={t("Official work away from the usual place. An approved On Duty day counts as a present, payable day.")} /><OnDutyTab /></>
        : tab === "regularization"
        ? <><PageHeader eyebrow={t("Attendance")} title={t("Regularization")} emphasis={t("requests")} sub={t("Ask for the real check-in and check-out of a day. Admin and HR decide.")} /><RegularizationTab /></>
        : showTeam ? <AttendanceTeam /> : <AttendanceSummary />}
    </div>
  );
}

import { PageHeader } from "@/components/PageHeader";
import { SegmentedFilter } from "@/components/table/Table";
import { toQueryString } from "@/lib/api";
import { PageLoading, useData, usePage } from "@/lib/page";
import { RegisterBody, type RegisterData } from "../register/RegisterBody";

/** The Team view of the Attendance summary: everyone for Admin / HR, a manager's direct reports for a manager (the API decides who). */
export function AttendanceTeam() {
  const { t, user, searchParams } = usePage();
  const filters = Object.fromEntries(Object.entries(searchParams).filter(([parameterName]) => parameterName !== "tab" && parameterName !== "scope"));
  const register = useData<RegisterData>(`/api/v1/attendance/team-register${toQueryString(filters)}`);
  if (!register) return <PageLoading />;
  const sub = user.perms.has("att.all") ? t("Everyone's check-ins for the day or the month.") : t("Your direct reports' check-ins for the day or the month.");
  return (
    <div className="col" style={{ gap: 24 }}>
      <PageHeader eyebrow={t("Attendance")} title={t("Team")} emphasis={t("attendance")} sub={sub}>
        <SegmentedFilter name="view" dflt="day" label={t("Register view")} options={[{ value: "day", label: t("Daily log") }, { value: "month", label: t("Monthly grid") }]} />
      </PageHeader>
      <RegisterBody register={register} />
    </div>
  );
}

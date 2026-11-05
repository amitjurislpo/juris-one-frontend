import { PageHeader } from "@/components/PageHeader";
import { SegmentedFilter } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { RegisterBody, type RegisterData } from "./RegisterBody";

export default function RegisterPage() {
  const { t, searchParams } = usePage();
  const register = useData<RegisterData>(`/api/v1/attendance/register${toQueryString(searchParams)}`);
  if (!register) return <PageLoading />;
  const exportQs = new URLSearchParams(Object.entries(searchParams).flatMap(([parameterName, paramValue]) => (typeof paramValue === "string" && parameterName !== "page" ? [[parameterName, paramValue]] : []))).toString();

  return (
    <div className="col">
      <PageHeader eyebrow={t("People operations · Attendance")} title={t("Attendance")} emphasis={t("register")} sub={t("Everyone's check-ins across India and US teams — shown in the time zone you pick.")}>
        <a className="btn" href={`/api/v1/attendance/register/export${exportQs ? `?${exportQs}` : ""}`} download>{t("Export CSV")}</a>
        <SegmentedFilter name="view" dflt="day" label={t("Register view")} options={[{ value: "day", label: t("Daily log") }, { value: "month", label: t("Monthly grid") }]} />
      </PageHeader>
      <RegisterBody register={register} />
    </div>
  );
}

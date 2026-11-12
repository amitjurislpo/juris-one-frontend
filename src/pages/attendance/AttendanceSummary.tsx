import { useState } from "react";
import { ComingInPhase, PageHeader } from "@/components/PageHeader";
import { WorkingFor } from "@/components/WorkingFor";
import { PageLoading, useData, usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { toQueryString } from "@/lib/api";
import { AttendanceDayList } from "./AttendanceDayList";
import { AttendanceDayTable } from "./AttendanceDayTable";
import { AttendanceFooter } from "./AttendanceFooter";
import { AttendanceMonthView, type MonthData } from "./AttendanceMonthView";
import { AttendanceToolbar } from "./AttendanceToolbar";
import { OnDutyRequestModal } from "./OnDutyRequestModal";
import { RegularizationRequestModal } from "./RegularizationRequestModal";
import { RemoteWorkRequestModal } from "./RemoteWorkRequestModal";
import { requestMenuKinds, type RequestKind } from "./requestKinds";
import { STATUS_FILTER_LABEL, useAttendanceView, type AttendanceSummaryData } from "./attendanceViews";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (isoDate: string, days: number) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** The period the API is asked for: the URL's week (`from`) or month, else nothing (the API then uses this week / this month). */
function periodQuery(view: string, searchParams: Record<string, string | undefined>): Record<string, string> {
  if (view === "calendar") {
    const month = searchParams.month;
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return {};
    return { from: `${month}-01`, to: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10) };
  }
  const from = searchParams.from;
  return from && ISO_DATE.test(from) ? { from, to: addDays(from, 6) } : {};
}

/** Attendance summary: List / Tabular / Calendar of the period, the filter, Export / Print, and the day counters underneath. */
export function AttendanceSummary() {
  const { t, searchParams } = usePage();
  const readOnly = useReadOnly();
  const { view, setView } = useAttendanceView();
  // the request form open on this page: the Request menu picks the kind, a day's "Regularize" button opens regularization for that day
  const [request, setRequest] = useState<{ kind: RequestKind; date: string } | null>(null);
  const status = view !== "calendar" && searchParams.status && searchParams.status in STATUS_FILTER_LABEL ? searchParams.status : "";
  const summary = useData<AttendanceSummaryData>(`/api/v1/attendance/summary${toQueryString({ view, ...periodQuery(view, searchParams), ...(status ? { status } : {}) })}`);
  const month = useData<MonthData>(view === "calendar" ? `/api/v1/attendance/mine${toQueryString(searchParams)}` : null);
  if (!summary) return <PageLoading />;
  if (!summary.tracked) return <div className="col"><PageHeader eyebrow={t("Attendance")} title={t("My")} emphasis={t("attendance")} /><ComingInPhase phase={2} t={t} what={t("Attendance isn't tracked for your account.")} /></div>;
  if (view === "calendar" && !month) return <PageLoading />;

  const requestKinds = requestMenuKinds({ isReadOnly: readOnly, isMonthLocked: month?.locked ?? false });
  const closeRequest = () => setRequest(null);
  const openRegularization = (date: string) => setRequest({ kind: "regularization", date });
  return (
    <div className="col" style={{ gap: 24 }}>
      {request?.kind === "regularization" && <RegularizationRequestModal date={request.date} onClose={closeRequest} />}
      {request?.kind === "on-duty" && <OnDutyRequestModal onClose={closeRequest} />}
      {request?.kind === "remote-work" && <RemoteWorkRequestModal onClose={closeRequest} />}
      <PageHeader eyebrow={t("Attendance")} title={t("My")} emphasis={t("attendance")} sub={t("Tap any day to see its check-in, check-out and how it counts.")} />
      {summary.openSince && <div className="att-noprint"><WorkingFor since={summary.openSince} /></div>}
      <AttendanceToolbar data={summary} view={view} onView={setView} status={status} requestKinds={requestKinds} onRequest={(kind) => setRequest({ kind, date: summary.workDate })} />
      {view === "calendar" && month ? <AttendanceMonthView data={month} /> : (
        <section className="card enter">
          {view === "list"
            ? <AttendanceDayList days={summary.days} onRegularize={readOnly ? null : openRegularization} />
            : <AttendanceDayTable days={summary.days} onRegularize={readOnly ? null : openRegularization} />}
        </section>
      )}
      <AttendanceFooter counters={summary.counters} shiftName={`${summary.shift.name} · ${summary.shift.start} – ${summary.shift.end}`} />
    </div>
  );
}

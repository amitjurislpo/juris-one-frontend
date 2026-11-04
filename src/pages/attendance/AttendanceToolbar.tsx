import { Icon } from "@/components/Icon";
import { SelectFilter } from "@/components/table/Table";
import Link from "@/lib/link";
import { formatDayMonth, formatDayMonthYear, MONTH_NAMES } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { toQueryString } from "@/lib/api";
import { ATTENDANCE_VIEWS, STATUS_FILTER_LABEL, type AttendanceSummaryData, type AttendanceView } from "./attendanceViews";

const VIEW_ICON: Record<AttendanceView, string> = { list: "menu", tabular: "grid", calendar: "cal" };
const VIEW_LABEL: Record<AttendanceView, string> = { list: "List", tabular: "Tabular", calendar: "Calendar" };

/** Period navigator, the three view buttons, the status filter, the request button and Export CSV / PDF / Print. */
export function AttendanceToolbar({ data, view, onView, status, onRequest }: { data: AttendanceSummaryData; view: AttendanceView; onView: (view: AttendanceView) => void; status: string; onRequest: (() => void) | null }) {
  const t = useT();
  const isCalendar = view === "calendar";
  const link = (from: string) => `/attendance${toQueryString({ view, ...(isCalendar ? { month: from.slice(0, 7) } : { from }), ...(status ? { status } : {}) })}`;
  const period = isCalendar ? `${t(MONTH_NAMES[Number(data.from.slice(5, 7)) - 1])} ${data.from.slice(0, 4)}` : `${formatDayMonth(data.from)} – ${formatDayMonthYear(data.to)}`;
  const exportLink = (format: "csv" | "pdf") => `/api/v1/attendance/summary/export${toQueryString({ format, from: data.from, to: data.to, ...(status ? { status } : {}) })}`;
  return (
    <div className="toolbar enter att-noprint" style={{ flexWrap: "wrap", gap: 10 }}>
      <Link className="icon-btn" href={link(data.previousFrom)} aria-label={isCalendar ? t("Previous month") : t("Previous week")}><Icon name="chevL" /></Link>
      <b aria-live="polite">{period}</b>
      <Link className="icon-btn" href={link(data.nextFrom)} aria-label={isCalendar ? t("Next month") : t("Next week")}><Icon name="chevR" /></Link>
      <div className="seg" role="group" aria-label={t("Attendance view")}>
        {ATTENDANCE_VIEWS.map((option) => (
          <button key={option} type="button" className={view === option ? "on" : undefined} aria-pressed={view === option} title={t(VIEW_LABEL[option])} aria-label={t(VIEW_LABEL[option])} onClick={() => onView(option)}>
            <Icon name={VIEW_ICON[option]} size={15} />
          </button>
        ))}
      </div>
      {!isCalendar && <SelectFilter name="status" label={t("Filter")} dflt="" options={[{ value: "", label: t("All days") }, ...Object.entries(STATUS_FILTER_LABEL).map(([value, label]) => ({ value, label: t(label) }))]} />}
      <span style={{ flex: 1 }}></span>
      <a className="btn btn-sm btn-ghost" href={exportLink("csv")} download><Icon name="download" size={14} /> {t("Export CSV")}</a>
      <a className="btn btn-sm btn-ghost" href={exportLink("pdf")} download><Icon name="download" size={14} /> {t("Export PDF")}</a>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()}>{t("Print")}</button>
      {onRequest && <button type="button" className="btn btn-gold" onClick={onRequest}>{t("Request regularization")}</button>}
    </div>
  );
}

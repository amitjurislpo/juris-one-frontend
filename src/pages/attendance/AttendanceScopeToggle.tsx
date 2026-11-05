import { useQuery } from "@/components/table/useQuery";
import { useT } from "@/lib/i18n/client";

/** Filters of one view that mean nothing in the other (My data uses view=list|tabular|calendar, Team uses view=day|month): switching clears them. */
const VIEW_PARAMS = ["view", "date", "month", "from", "to", "status", "page", "search", "sort", "sortDirection", "region", "departmentId", "timeZone"];

/** My data | Team on the Attendance summary, kept in the URL (?scope=team). Shown to Admin / HR (everyone) and managers (their direct reports). */
export function AttendanceScopeToggle() {
  const t = useT();
  const { get, set } = useQuery();
  const scope = get("scope", "mine");
  const choose = (value: "mine" | "team") => set({ ...Object.fromEntries(VIEW_PARAMS.map((parameterName) => [parameterName, null])), scope: value === "team" ? "team" : null });
  return (
    <div className="seg" role="group" aria-label={t("Whose attendance")}>
      <button type="button" className={scope === "mine" ? "on" : undefined} aria-pressed={scope === "mine"} onClick={() => choose("mine")}>{t("My data")}</button>
      <button type="button" className={scope === "team" ? "on" : undefined} aria-pressed={scope === "team"} onClick={() => choose("team")}>{t("Team")}</button>
    </div>
  );
}

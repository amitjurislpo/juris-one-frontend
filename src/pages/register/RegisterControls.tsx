
import { Icon } from "@/components/Icon";
import { useQuery } from "@/components/table/useQuery";
import { addDays } from "@/lib/attendance/engine";
import { useT } from "@/lib/i18n/client";

/** Date picker (no future dates) with previous / next day. */
export function DayNav({ day, max }: { day: string; max: string }) {
  const t = useT();
  const { set } = useQuery();
  const goToDate = (dateText: string) => set({ date: dateText === max ? null : dateText });
  return (
    <div className="daynav">
      <button className="icon-btn" onClick={() => goToDate(addDays(day, -1))} aria-label={t("Previous day")}><Icon name="chevL" size={16} /></button>
      <input type="date" value={day} max={max} aria-label={t("Date")} onChange={(e) => e.target.value && goToDate(e.target.value > max ? max : e.target.value)} />
      <button className="icon-btn" onClick={() => goToDate(addDays(day, 1))} disabled={day >= max} aria-label={t("Next day")}><Icon name="chevR" size={16} /></button>
    </div>
  );
}

export function ZonePicker({ zones, value }: { zones: readonly { value: string; label: string }[]; value: string }) {
  const t = useT();
  const { set } = useQuery();
  return (
    <label className="tsel tz">
      <Icon name="globe" size={15} />
      <span>{t("Show times in")}</span>
      <select value={value} onChange={(e) => set({ timeZone: e.target.value })}>{zones.map((zone) => <option key={zone.value} value={zone.value}>{t(zone.label)}</option>)}</select>
    </label>
  );
}

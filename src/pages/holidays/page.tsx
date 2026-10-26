import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pending, SearchBox, SegmentedFilter, SortableHeader } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { formatWeekdayDayMonthYear } from "@/lib/format";
import { DeleteHoliday, HolidayPlanner } from "./HolidaysClient";


/** Filtered (?search=&region=) and sorted by the API. */
interface Item { id: string; date: string; name: string; region: "IN" | "US" | "ALL"; addedBy: string }
const RCHIP = { IN: "gold", US: "info", ALL: "ok" } as const;
const RLABEL = { IN: "India team", US: "US team", ALL: "Everyone" } as const;

export default function HolidaysPage() {
  const { t, searchParams } = usePage();
  const data = useData<{ items: Item[]; rows: Item[]; today: string }>(`/api/holidays${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { items, rows, today } = data;

  return (
    <div className="col">
      <PageHeader eyebrow={t("People operations")} title={t("Holiday")} emphasis={t("calendar")} sub={t("India and US teams each see their own holidays — plus the ones marked for everyone.")} />
      <HolidayPlanner holidays={items.map(({ date, name, region: holidayRegion }) => ({ date, name, region: holidayRegion }))} today={today} />
      <div className="toolbar enter" style={{ ["--i" as string]: 3 }}>
        <SearchBox placeholder={t("Search holidays")} label={t("Search holidays")} />
        <SegmentedFilter name="region" dflt="All" label={t("Team")} options={[{ value: "All", label: t("All teams") }, { value: "IN", label: t("India") }, { value: "US", label: t("US") }]} />
        <span className="tcount">{rows.length === 1 ? t("1 holiday") : t("{n} holidays", { n: rows.length })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 4 }}>
        <Pending>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <SortableHeader sortKey="date" dflt="date">{t("Date")}</SortableHeader>
                  <SortableHeader sortKey="name" dflt="date">{t("Holiday")}</SortableHeader>
                  <SortableHeader sortKey="region" dflt="date">{t("Applies to")}</SortableHeader>
                  <SortableHeader sortKey="addedBy" dflt="date">{t("Added by")}</SortableHeader>
                  <th><span className="sr-only">{t("Actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((holiday) => {
                  const past = holiday.date < today;
                  return (
                    <tr key={holiday.id} className={past ? "dim" : undefined}>
                      <td className="num">{formatWeekdayDayMonthYear(holiday.date)}</td>
                      <td><b style={{ fontWeight: 600 }}>{holiday.name}</b></td>
                      <td><span className={`chip nodot ${RCHIP[holiday.region]}`}>{t(RLABEL[holiday.region])}</span></td>
                      <td className="muted">{holiday.addedBy}</td>
                      <td className="r">{past ? <span className="faint" style={{ fontSize: 12 }}>{t("Passed")}</span> : <DeleteHoliday id={holiday.id} name={holiday.name} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="empty"><b>{t("No holidays match")}</b><span className="muted">{t("Try another search.")}</span><ClearFilters /></div>}
        </Pending>
      </section>
    </div>
  );
}


import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog } from "@/components/ui/Modal";
import { addDays, weekdayOf } from "@/lib/attendance/engine";
import { MONTH_NAMES } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { addHoliday, deleteHoliday } from "./actions";

type Region = "IN" | "US" | "ALL";
interface HolidayEntry { date: string; name: string; region: Region }
const RCLS: Record<Region, string> = { IN: "r-India", US: "r-US", ALL: "r-All" };
const RNAME: Record<Region, string> = { IN: "India", US: "US", ALL: "Everyone" };

/** Month calendar (tap a date to pre-fill) + add form — prototype tpl-holidays. */
export function HolidayPlanner({ holidays, today }: { holidays: HolidayEntry[]; today: string }) {
  const toast = useToast();
  const t = useT();
  const readOnly = useReadOnly();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [form, setForm] = useState<{ date: string; name: string; region: Region }>({ date: "", name: "", region: "IN" });
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  const move = (monthOffset: number) => setMonth(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + monthOffset, 1)).toISOString().slice(0, 7));
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  const lead = (weekdayOf(first) + 6) % 7;

  const add = () => {
    setTried(true);
    setErr("");
    if (!form.date || !form.name.trim()) return;
    start(async () => {
      const result = await addHoliday(form);
      if (result.ok) { toast(result.message!); setForm({ date: "", name: "", region: form.region }); setTried(false); }
      else setErr(result.error);
    });
  };

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <section className="card pad enter" style={{ ["--i" as string]: 1, flex: "1 1 380px", minWidth: 0 }}>
        <span className="spot"></span>
        <div className="card-h">
          <h3>{t(MONTH_NAMES[Number(month.slice(5)) - 1])} {month.slice(0, 4)}</h3>
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn" onClick={() => move(-1)} aria-label={t("Previous month")}><Icon name="chevL" size={16} /></button>
            <button className="icon-btn" onClick={() => move(1)} aria-label={t("Next month")}><Icon name="chevR" size={16} /></button>
          </div>
        </div>
        <div className="hcal">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => <span className="w" key={w}>{t(w)}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`}></span>)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const isoDate = addDays(first, i);
            const dayHolidays = holidays.filter((h) => h.date === isoDate);
            const isWeekend = [0, 6].includes(weekdayOf(isoDate));
            return (
              <button key={isoDate} type="button" className={[isWeekend && "wk", isoDate === today && "today", dayHolidays.length && "has", form.date === isoDate && "sel"].filter(Boolean).join(" ")}
                title={dayHolidays.map((holiday) => `${holiday.name} (${t(RNAME[holiday.region])})`).join(", ") || (readOnly ? undefined : t("Add a holiday on this date"))}
                onClick={() => { if (readOnly) return; setForm({ ...form, date: isoDate }); requestAnimationFrame(() => nameRef.current?.focus()); }}>
                <b>{i + 1}</b>
                {dayHolidays.map((h) => <small key={h.name + h.region} className={RCLS[h.region]}>{h.name}</small>)}
              </button>
            );
          })}
        </div>
        {!readOnly && <p className="faint" style={{ margin: "12px 0 0", fontSize: 12.5 }}>{t("Tap a date to add a holiday on it.")}</p>}
      </section>
      {!readOnly && <section className="card pad enter" style={{ ["--i" as string]: 2, flex: "1 1 320px" }}>
        <span className="spot"></span>
        <div className="card-h"><h3>{t("Add holiday")}</h3></div>
        <div className="col" style={{ gap: 14 }}>
          <label className="field">{t("Date *")}<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="field">{t("Holiday name *")}<input ref={nameRef} value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("e.g. Diwali")} onKeyDown={(e) => e.key === "Enter" && add()} /></label>
          <div className="field">{t("Applies to")}
            <div className="seg" style={{ width: "100%" }} role="group" aria-label={t("Applies to")}>
              {(["IN", "US", "ALL"] as Region[]).map((region) => (
                <button key={region} type="button" className={form.region === region ? "on" : undefined} aria-pressed={form.region === region} onClick={() => setForm({ ...form, region: region })}>{region === "ALL" ? t("Everyone") : region === "IN" ? t("India team") : t("US team")}</button>
              ))}
            </div>
          </div>
          {tried && (!form.date || !form.name.trim()) && <p className="err" style={{ margin: 0 }}>{t("Pick a date and enter a name.")}</p>}
          {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
          <button className="btn btn-gold" disabled={busy} onClick={add}><Icon name="plus" size={15} />{t("Add to calendar")}</button>
          <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>{t("Employees see it under “Upcoming holidays”. Holidays aren't counted as leave or loss of pay.")}</p>
        </div>
      </section>}
    </div>
  );
}

export function DeleteHoliday({ id, name }: { id: string; name: string }) {
  const toast = useToast();
  const t = useT();
  const readOnly = useReadOnly();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  const rmParts = t("Remove {name} from the calendar?", { name: "\u0000" }).split("\u0000");
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-sm btn-ghost" onClick={() => setAsk(true)} aria-label={t("Remove {name}", { name })}><Icon name="trash" size={14} /></button>
      {ask && (
        <ConfirmDialog title={t("Remove holiday")} danger confirm={t("Remove")} busy={busy} onClose={() => setAsk(false)} body={<>{rmParts[0]}<b>{name}</b>{rmParts[1]}</>}
          onConfirm={() => start(async () => { const result = await deleteHoliday(id); toast(result.ok ? result.message! : result.error, "bad"); setAsk(false); })} />
      )}
    </>
  );
}

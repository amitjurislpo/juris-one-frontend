
import { useEffect, useMemo, useState, useTransition } from "react";
import { useDismissOnEdit } from "@/lib/useDismissOnEdit";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { Modal } from "@/components/ui/Modal";
import { addDays, weekdayOf } from "@/lib/attendance/engine";
import { formatDayMonth, formatWeekdayDayMonthYear, MONTH_NAMES } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { Preview } from "@/lib/api-types";
import { applyLeave, preview } from "./actions";

export interface LeaveTypeOption { code: string; name: string; available: number | null; paid: boolean; lockedReason: string | null }
type Part = "FULL" | "FIRST_HALF" | "SECOND_HALF";

/** Prototype range picker: tap a start, then an end; weekends, holidays and past dates disabled. */
function RangePicker({ startDate, endDate, onPick, today, holidays, weeklyOffs }: { startDate: string; endDate: string; onPick: (startDate: string, endDate: string) => void; today: string; holidays: Record<string, string>; weeklyOffs: number[] }) {
  const t = useT();
  const [month, setMonth] = useState((startDate || today).slice(0, 7));
  const [picking, setPicking] = useState(false);
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  const lead = (weekdayOf(first) + 6) % 7;
  const rangeStart = startDate && endDate ? (startDate < endDate ? startDate : endDate) : startDate;
  const rangeEnd = startDate && endDate ? (startDate < endDate ? endDate : startDate) : startDate;
  const move = (monthOffset: number) => setMonth(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + monthOffset, 1)).toISOString().slice(0, 7));
  return (
    <div className="drp">
      <div className="drp-h">
        <button className="icon-btn" type="button" onClick={() => move(-1)} aria-label={t("Previous month")} disabled={month <= today.slice(0, 7)}><Icon name="chevL" /></button>
        <b>{t(MONTH_NAMES[Number(month.slice(5)) - 1])} {month.slice(0, 4)}</b>
        <button className="icon-btn" type="button" onClick={() => move(1)} aria-label={t("Next month")}><Icon name="chevR" /></button>
      </div>
      <div className="drp-g">
        {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => <span className="w" key={i}>{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span className="blank" key={`b${i}`}></span>)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const isoDate = addDays(first, i);
          const isWeeklyOff = weeklyOffs.includes(weekdayOf(isoDate));
          const hol = holidays[isoDate];
          const dis = isoDate < today || isWeeklyOff || !!hol;
          const cls = [hol && "hol", isoDate === today && "td", isoDate === rangeStart && "s", isoDate === rangeEnd && "e", rangeStart && rangeEnd && isoDate > rangeStart && isoDate < rangeEnd && "in"].filter(Boolean).join(" ");
          return (
            <button key={isoDate} type="button" className={cls || undefined} disabled={dis} title={hol || (isWeeklyOff ? t("Weekend") : undefined)} aria-label={`${formatWeekdayDayMonthYear(isoDate)}${hol ? `, ${hol}` : ""}`}
              aria-pressed={isoDate === rangeStart || isoDate === rangeEnd}
              onClick={() => { if (!picking || !startDate) { onPick(isoDate, isoDate); setPicking(true); } else { onPick(startDate, isoDate); setPicking(false); } }}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="faint" style={{ fontSize: 11.5, marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <span><span style={{ color: "var(--gold)" }}>●</span> {t("Holiday")}</span><span>{t("Weekends, holidays and past dates can't be picked")}</span>
      </div>
    </div>
  );
}

export function ApplyLeave({ types, today, holidays, weeklyOffs, onClose }: { types: LeaveTypeOption[]; today: string; holidays: Record<string, string>; weeklyOffs: number[]; onClose: () => void }) {
  const toast = useToast();
  const t = useT();
  const [type, setType] = useState((types.find((leaveType) => leaveType.code === "CL" && !leaveType.lockedReason) ?? types.find((leaveType) => !leaveType.lockedReason) ?? types[0]).code);
  const [range, setRange] = useState({ from: "", to: "" });
  const [part, setPart] = useState<Part>("FULL");
  const [reason, setReason] = useState("");
  const [previewResult, setPreviewResult] = useState<Preview | null>(null);
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  useDismissOnEdit(err, () => setErr(""), type, range, part, reason);
  const rangeStart = range.from && range.to ? [range.from, range.to].sort()[0] : range.from;
  const rangeEnd = range.from && range.to ? [range.from, range.to].sort()[1] : range.from;
  const single = !!rangeStart && rangeStart === rangeEnd;
  const tName = types.find((x) => x.code === type)!.name;

  const query = useMemo(() => (rangeStart ? { type, from: rangeStart, to: rangeEnd, part: single ? part : ("FULL" as Part), reason } : null), [type, rangeStart, rangeEnd, single, part, reason]);
  useEffect(() => {
    if (!query) return;
    let alive = true;
    const timer = setTimeout(() => preview(query).then((r) => { if (alive && r.ok) setPreviewResult(r.data!); }), 120);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);
  const visiblePreview = query ? previewResult : null;

  const submit = () => {
    setTried(true);
    setErr("");
    if (!query) return;
    start(async () => {
      const result = await applyLeave(query);
      if (result.ok) { toast(result.message!); onClose(); } else setErr(result.error);
    });
  };

  return (
    <Modal title={t("Apply for leave")} eyebrow={t("New request")} onClose={onClose}
      footer={<>
        <span className="muted" style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}><Icon name="shield" size={15} />{t("Sent to HR for approval")}</span>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
          <button className="btn btn-gold" onClick={submit} disabled={!rangeStart || busy || !!visiblePreview?.error}><Icon name="ok" size={16} />{busy ? t("Sending…") : t("Apply leave")}</button>
        </div>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 26 }}>
        <div className="col" style={{ gap: 20 }}>
          <div>
            <div className="field" style={{ marginBottom: 10 }}>{t("1 · Leave type")}</div>
            <div className="ltypes" role="radiogroup" aria-label={t("Leave type")}>
              {types.map((typeOption) => (
                <button key={typeOption.code} type="button" role="radio" aria-checked={type === typeOption.code} className={`ltype${type === typeOption.code ? " on" : ""}`} onClick={() => setType(typeOption.code)} disabled={!!typeOption.lockedReason} title={typeOption.lockedReason ? t(typeOption.lockedReason) : undefined}>
                  <span className="tick"><Icon name="ok" size={12} /></span><b>{t(typeOption.name)}</b><small>{typeOption.lockedReason ? t("Not during probation") : typeOption.available === null ? t("Unpaid") : t("{n} available", { n: typeOption.available })}</small>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="field" style={{ marginBottom: 10 }}>{t("2 · Start and end date")} <span className="hint">{t("tap a start date, then an end date")}</span></div>
            <RangePicker startDate={range.from} endDate={range.to} onPick={(startDate, endDate) => setRange({ from: startDate, to: endDate })} today={today} holidays={holidays} weeklyOffs={weeklyOffs} />
          </div>
        </div>
        <div className="col" style={{ gap: 18 }}>
          <div className="grid2">
            <div className="field">{t("Start date")}<input readOnly value={rangeStart ? formatWeekdayDayMonthYear(rangeStart) : t("Pick on calendar")} aria-label={t("Start date")} /></div>
            <div className="field">{t("End date")}<input readOnly value={rangeEnd ? formatWeekdayDayMonthYear(rangeEnd) : "—"} aria-label={t("End date")} /></div>
          </div>
          {single && (
            <div className="field">{t("Duration")}
              <div className="seg" style={{ width: "100%" }} role="group" aria-label={t("Duration")}>
                {([["FULL", "Full day"], ["FIRST_HALF", "First half"], ["SECOND_HALF", "Second half"]] as [Part, string][]).map(([partCode, partLabel]) => (
                  <button key={partCode} type="button" className={part === partCode ? "on" : undefined} aria-pressed={part === partCode} onClick={() => setPart(partCode)}>{t(partLabel)}</button>
                ))}
              </div>
            </div>
          )}
          <label className="field">{t("3 · Reason")} <span className="hint">{t("optional")}</span><textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder={t("e.g. Family function in Jaipur")} /></label>
          <div className="summary" aria-live="polite">
            <div><small>{t("Working days")}</small><b>{visiblePreview ? visiblePreview.days : 0}</b></div>
            <div><small>{t("Balance after")}</small><b>{visiblePreview?.balanceAfter ?? "—"}</b></div>
            <div><small>{t("Loss of pay")}</small><b style={{ color: visiblePreview?.lopDays ? "var(--bad)" : "var(--ok)" }}>{visiblePreview?.lopDays ? t("{n} d", { n: visiblePreview.lopDays }) : t("None")}</b></div>
          </div>
          {visiblePreview && visiblePreview.skipped.length > 0 && <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>{t("Holidays skipped: {list}. Weekends are never counted.", { list: visiblePreview.skipped.map((skippedHoliday) => `${skippedHoliday.name} (${formatDayMonth(skippedHoliday.date)})`).join(", ") })}</p>}
          {visiblePreview && visiblePreview.lopDays > 0 && type !== "LOP" && <p style={{ margin: 0, fontSize: 13, color: "var(--warn)", fontWeight: 600 }}>{t("You don't have enough {type} — {n} day(s) will be unpaid.", { type: t(tName).toLowerCase(), n: visiblePreview.lopDays })}</p>}
          {visiblePreview?.error && <p className="err" style={{ margin: 0 }}>{visiblePreview.error}</p>}
          {tried && !rangeStart && <p className="err" style={{ margin: 0 }}>{t("Pick your dates on the calendar.")}</p>}
          {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
        </div>
      </div>
    </Modal>
  );
}

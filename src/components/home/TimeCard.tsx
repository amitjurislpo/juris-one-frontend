
import { useRouter } from "@/lib/router";
import { useEffect, useState, useTransition } from "react";
import { punch } from "@/pages/home/actions";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { shiftLabel } from "@/lib/shifts";

const pad = (n: number) => String(n).padStart(2, "0");

export interface TimeCardProps {
  checkedIn: boolean;
  openSince: string | null; // ISO
  closedMinutes: number;
  shiftText: string;
  ticks: string[];
  targetHours: number;
  log: { time: string; label: string; detail: string }[];
}

/** Prototype check-in card: live timer, 9h progress track, punch log. */
export function TimeCard(card: TimeCardProps) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const readOnly = useReadOnly();
  const [busy, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const liveMs = card.checkedIn && card.openSince && now ? Math.max(0, now - Date.parse(card.openSince)) : 0;
  const secs = Math.floor(card.closedMinutes * 60 + liveMs / 1000);
  const target = card.targetHours * 3600;
  const pct = Math.min(1, secs / target);
  const left = Math.max(0, target - secs);

  const punchNow = () =>
    start(async () => {
      const result = await punch(card.checkedIn ? "OUT" : "IN");
      if (result.ok) toast(result.message!);
      else toast(result.error, "bad");
      router.refresh();
    });

  return (
    <section className="card timecard span-7 enter" style={{ ["--i" as string]: 1 }} aria-label={t("Check in and check out")}>
      <span className="spot"></span>
      <div className="aur"></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, position: "relative" }}>
        <div><span className="eyebrow">{t("Today's shift")}</span><div style={{ fontWeight: 600, marginTop: 2 }}>{shiftLabel(card.shiftText, t)}</div></div>
        <span className={`chip ${card.checkedIn ? "ok" : "neutral"}`}>{card.checkedIn ? t("Checked in") : t("Checked out")}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div className="bigtime" aria-label={t("Worked today")} suppressHydrationWarning>
          {pad(Math.floor(secs / 3600))}<span>:</span>{pad(Math.floor((secs % 3600) / 60))}<span>:</span>{pad(secs % 60)}
        </div>
        <div className="faint" style={{ marginTop: 6, fontSize: 13 }}>{t("worked today · {percent}% of a {hours}h shift", { percent: Math.round(pct * 100), hours: card.targetHours })}</div>
      </div>
      <div style={{ position: "relative" }}>
        <div className="shift-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={t("Shift progress")}>
          <div className="fill" style={{ width: `${pct * 100}%` }}></div>
          <div className="knob" style={{ left: `${pct * 100}%` }}></div>
        </div>
        <div className="shift-ticks" style={{ marginTop: 10 }}>{card.ticks.map((tickLabel) => <span key={tickLabel}>{tickLabel}</span>)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", position: "relative" }}>
        {!readOnly && (
          <div className="punch">
            {!card.checkedIn && <span className="halo"></span>}
            <button className="btn btn-gold btn-lg" style={{ minWidth: 160 }} disabled={busy} onClick={punchNow}>
              <Icon name={card.checkedIn ? "logout" : "sunrise"} size={16} />{busy ? t("Saving…") : card.checkedIn ? t("Check out") : t("Check in")}
            </button>
          </div>
        )}
        <span className="muted" style={{ fontSize: 13 }}>
          {card.checkedIn ? (pct >= 1 ? t("Shift target reached") : t("{hours}h {minutes}m left in your shift", { hours: Math.floor(left / 3600), minutes: pad(Math.floor((left % 3600) / 60)) })) : t("Not tracking right now")}
        </span>
      </div>
      {card.log.length > 0 && (
        <div className="timeline" style={{ position: "relative" }}>
          {card.log.map((e, i) => (
            <div className="t" key={i}><b>{e.time}</b><span>{e.label}</span><span className="faint" style={{ marginLeft: "auto", fontSize: 12.5 }}>{e.detail}</span></div>
          ))}
        </div>
      )}
    </section>
  );
}

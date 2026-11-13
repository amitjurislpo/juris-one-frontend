import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { WorkingFor } from "@/components/WorkingFor";
import { useT } from "@/lib/i18n/client";
import { shiftLabel } from "@/lib/shifts";
import { punch } from "@/pages/home/actions";

/**
 * The shift card of the Attendance summary: today's shift, whether you are checked in (with the running time), an optional note for the
 * check-out, and the Check in / Check out button. It does what the Home card does; the page refetches after a punch.
 */
export function AttendanceShiftCard({ shiftText, openSince, canPunch }: { shiftText: string; openSince: string | null; canPunch: boolean }) {
  const t = useT();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  const checkedIn = openSince !== null;

  const punchNow = () => start(async () => {
    const result = await punch(checkedIn ? "OUT" : "IN", checkedIn ? note.trim() : undefined);
    if (result.ok) { toast(result.message!); setNote(""); } else toast(result.error, "bad");
  });

  return (
    <section className="card pad enter att-noprint" aria-label={t("Check in and check out")}>
      <div className="row" style={{ gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 160 }}><span className="eyebrow">{t("Today's shift")}</span><div style={{ fontWeight: 600, marginTop: 2 }}>{shiftLabel(shiftText, t)}</div></div>
        <span className={`chip ${checkedIn ? "ok" : "neutral"}`}>{checkedIn ? t("Checked in") : t("Checked out")}</span>
        {checkedIn && <WorkingFor since={openSince} />}
        <span style={{ flex: 1 }}></span>
        {canPunch && checkedIn && (
          <input className="input" style={{ maxWidth: 280 }} type="text" maxLength={500} value={note} disabled={busy} onChange={(event) => setNote(event.target.value)}
            placeholder={t("Add notes for check-out")} aria-label={t("Add notes for check-out")} />
        )}
        {canPunch && (
          <button className="btn btn-gold" disabled={busy} onClick={punchNow}>
            <Icon name={checkedIn ? "logout" : "sunrise"} size={16} /> {busy ? t("Saving…") : checkedIn ? t("Check out") : t("Check in")}
          </button>
        )}
      </div>
    </section>
  );
}

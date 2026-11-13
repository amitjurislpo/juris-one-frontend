
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { decideLeave, decideOnDuty, decideRegularization, decideRemoteWorkRequest } from "./actions";

const DECIDE = { leave: decideLeave, reg: decideRegularization, onDuty: decideOnDuty, remoteWork: decideRemoteWorkRequest };

export function DecideButtons({ id, kind, who }: { id: string; kind: keyof typeof DECIDE; who: string }) {
  const t = useT();
  const readOnly = useReadOnly();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const decide = (approve: boolean) =>
    start(async () => {
      const result = await DECIDE[kind]({ id, approve, note: note || undefined });
      toast(result.ok ? result.message! : result.error, result.ok && approve ? "ok" : "bad");
      setDeclining(false);
    });
  const declineParts = t("Decline {who}’s request? They’ll get an email.", { who: "\u0000" }).split("\u0000");
  const declineBody = <>{declineParts[0]}<b>{who}</b>{declineParts[1]}</>;
  if (readOnly) return null;
  return (
    <div className="acts">
      <button className="btn btn-danger" disabled={busy} onClick={() => setDeclining(true)}>{t("Decline")}</button>
      <button className="btn btn-gold" disabled={busy} onClick={() => decide(true)} aria-label={t("Approve {who}", { who })}><Icon name="ok" size={16} />{t("Approve")}</button>
      {declining && (
        <ConfirmDialog title={t("Decline request")} danger confirm={t("Decline")} busy={busy || (kind !== "leave" && !note.trim())} onClose={() => setDeclining(false)} body={declineBody} onConfirm={() => decide(false)}>
          <label className="field" style={{ marginTop: 14 }}>{t("Note to the employee")} {kind !== "leave" ? "*" : <span className="hint">{t("optional")}</span>}<input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t("e.g. Please apply after the filing deadline")} /></label>
        </ConfirmDialog>
      )}
    </div>
  );
}

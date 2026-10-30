
import { useRouter } from "@/lib/router";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Drawer } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { formatRupees } from "@/lib/format";
import { approveAllPending, decideProof, proofDetail, type ProofDetail, type ProofItem } from "./actions";

const CHIP: Record<string, string> = { DRAFT: "neutral", PENDING: "warn", APPROVED: "ok", REJECTED: "bad" };
const LABEL: Record<string, string> = { DRAFT: "Draft", PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };

export function ReviewButton({ employeeId, name, gold }: { employeeId: string; name: string; gold: boolean }) {
  const readOnly = useReadOnly();
  const [open, setOpen] = useState(false);
  const t = useT();
  if (readOnly) return null;
  return (
    <>
      <button className={`btn btn-sm${gold ? " btn-gold" : ""}`} onClick={() => setOpen(true)} aria-label={t("Review {name}", { name })}>{t("Review")}</button>
      {open && <ReviewDrawer employeeId={employeeId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReviewDrawer({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [detail, setDetail] = useState<ProofDetail | null>(null);
  const [busy, start] = useTransition();
  const [rejecting, setRejecting] = useState<ProofItem | null>(null);
  const [reason, setReason] = useState("");
  const load = useCallback(() => proofDetail(employeeId).then((response) => { if (response.ok) setDetail(response.data!); else toast(response.error, "bad"); }), [employeeId, toast]);
  useEffect(() => { void load(); }, [load]);

  const act = (pendingAction: Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    const actionResult = await pendingAction;
    toast(actionResult.ok ? actionResult.message! : actionResult.error!, actionResult.ok ? "ok" : "bad");
    await load();
    router.refresh();
  });

  return (
    <Drawer label={t("Review proofs")} width={580} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="eyebrow">{detail ? `${detail.code} · ${detail.regime === "OLD" ? t("Old regime") : t("New regime")}${detail.metro ? ` · ${t("metro")}` : ""}${detail.landlordPan ? ` · ${t("landlord PAN {pan}", { pan: detail.landlordPan })}` : ""}` : t("Loading…")}</span>
          <h2 className="display" style={{ margin: "4px 0 0", fontSize: 30 }}>{detail?.name ?? ""}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label={t("Close")}><Icon name="x" size={16} /></button>
      </div>
      {detail && (
        <>
          <div className="summary">
            <div><small>{t("TDS / month now")}</small><b>{detail.tdsNow === null ? "—" : formatRupees(detail.tdsNow * 100)}</b></div>
            <div><small>{t("If all approved")}</small><b style={{ color: "var(--ok)" }}>{detail.tdsIfAll === null ? "—" : formatRupees(detail.tdsIfAll * 100)}</b></div>
          </div>
          {detail.regime === "NEW" && <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>{t("This employee is on the new regime — proofs only count if they switch to the old regime. The preview assumes the old regime.")}</p>}
          {detail.mine && <p className="err" style={{ margin: 0 }}>{t("These are your own declarations — someone else in Finance must verify them.")}</p>}
          <div className="list">
            {detail.items.map((proofItem) => (
              <div className="it" key={proofItem.id} style={{ flexWrap: "wrap" }}>
                <span className="chip gold nodot" style={{ minWidth: 76, justifyContent: "center" }}>{proofItem.section}</span>
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <b style={{ fontWeight: 500 }}>{proofItem.label}</b>
                  <div className="faint" style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                    <Icon name="doc" size={12} />{proofItem.hasProof ? <a className="linkish" style={{ fontSize: 12 }} href={`/api/v1/declarations/proofs/${proofItem.id}`} target="_blank" rel="noopener">{proofItem.proofName ?? t("Open proof")}</a> : t("No proof attached")}
                  </div>
                  {proofItem.reason && <div style={{ fontSize: 12, color: "var(--bad)" }}>{t("Rejected: {reason}", { reason: proofItem.reason })}</div>}
                </div>
                <b className="num">{formatRupees(proofItem.amount)}</b>
                {proofItem.status === "PENDING" && !detail.mine ? (
                  <>
                    <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => { setReason(""); setRejecting(proofItem); }}>{t("Reject")}</button>
                    <button className="btn btn-sm btn-gold" disabled={busy} onClick={() => act(decideProof({ id: proofItem.id, approve: true }))} aria-label={t("Approve {label}", { label: proofItem.label })}>{t("Approve")}</button>
                  </>
                ) : (
                  <span className={`chip ${CHIP[proofItem.status]}`}>{t(LABEL[proofItem.status])}</span>
                )}
              </div>
            ))}
            {!detail.items.length && <div className="faint">{t("Nothing declared.")}</div>}
          </div>
          <button className="btn btn-gold" disabled={busy || detail.mine || !detail.items.some((pendingItem) => pendingItem.status === "PENDING")} onClick={() => act(approveAllPending(employeeId))}><Icon name="ok" size={15} />{t("Approve all pending")}</button>
        </>
      )}
      {rejecting && (
        <ConfirmDialog title={t("Reject proof")} danger confirm={t("Reject")} busy={busy} onClose={() => setRejecting(null)} body={<>{t("Reject {label} ({amount})? The employee can fix and resubmit.", { label: rejecting.label, amount: formatRupees(rejecting.amount) })}</>}
          onConfirm={() => { act(decideProof({ id: rejecting.id, approve: false, reason })); setRejecting(null); }}>
          <label className="field" style={{ marginTop: 14 }}>{t("Reason *")}<input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={t("e.g. Receipt is for last year")} autoFocus /></label>
        </ConfirmDialog>
      )}
    </Drawer>
  );
}

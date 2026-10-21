
import { usePathname, useRouter } from "@/lib/router";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { cancelLeave } from "./actions";
import { ApplyLeave, type TypeOpt } from "./ApplyLeave";

export function ApplyButton({ types, today, holidays, weeklyOffs, autoOpen }: { types: TypeOpt[]; today: string; holidays: Record<string, string>; weeklyOffs: number[]; autoOpen: boolean }) {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const readOnly = useReadOnly();
  const [open, setOpen] = useState(autoOpen);
  const close = () => { setOpen(false); if (autoOpen) router.replace(path, { scroll: false }); };
  if (readOnly) return null;
  // nothing to apply against: no leave types at all, or every type is a balance-based one with less than half a day left
  const none = types.length === 0 || types.every((x) => x.lockedReason || (x.available !== null && x.available < 0.5));
  return (
    <>
      <button className="btn btn-gold btn-lg" onClick={() => setOpen(true)}><Icon n="plus" s={18} />{t("Apply leave")}</button>
      {open && none && (
        <Modal title={t("You can't apply for leave right now")} onClose={close} footer={<button className="btn btn-gold" onClick={close}>{t("OK")}</button>}>
          <p className="muted" style={{ margin: 0 }}>{t("You have no leave available at the moment. Leave is added to your balance as you earn it, so you can apply once you have some. Talk to HR if you think this is wrong.")}</p>
        </Modal>
      )}
      {open && !none && <ApplyLeave types={types} today={today} holidays={holidays} weeklyOffs={weeklyOffs} onClose={close} />}
    </>
  );
}

export function CancelLeave({ id }: { id: string }) {
  const toast = useToast();
  const t = useT();
  const readOnly = useReadOnly();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-sm btn-danger" onClick={() => setAsk(true)}>{t("Cancel")}</button>
      {ask && (
        <ConfirmDialog title={t("Cancel leave request")} danger confirm={t("Cancel request")} busy={busy} onClose={() => setAsk(false)} body={t("This withdraws the request before HR decides on it.")}
          onConfirm={() => start(async () => { const r = await cancelLeave(id); toast(r.ok ? r.msg! : r.error, r.ok ? "ok" : "bad"); setAsk(false); })} />
      )}
    </>
  );
}

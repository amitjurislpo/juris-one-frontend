import { Modal } from "@/components/ui/Modal";
import { formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { swipeSource, type DayDetail, type DaySwipe } from "./attendanceInfo";

/** One swipe in full: who, when, and the card and place it came from. */
export function SwipeInfoModal({ swipe, employee, onClose }: { swipe: DaySwipe; employee: DayDetail["employee"]; onClose: () => void }) {
  const t = useT();
  return (
    <Modal title={t("Swipe info")} eyebrow={swipe.kind === "IN" ? t("Check-in") : t("Check-out")} size="sm" onClose={onClose}
      footer={<button className="btn btn-ghost" onClick={onClose}>{t("Close")}</button>}>
      <div className="kv"><span className="muted">{t("Employee name")}</span><b>{employee.name}</b></div>
      <div className="kv"><span className="muted">{t("Employee ID")}</span><b className="num">{employee.code}</b></div>
      <div className="kv"><span className="muted">{t("Swipe date")}</span><b className="num">{formatDayMonthYear(swipe.date)}</b></div>
      <div className="kv"><span className="muted">{t("Swipe time")}</span><b className="num">{swipe.time}</b></div>
      <div className="kv"><span className="muted">{t("Access card number")}</span><b className="num">{employee.accessCardNumber ?? "—"}</b></div>
      <div className="kv"><span className="muted">{t("Location / Source")}</span><b style={{ overflowWrap: "anywhere", textAlign: "right" }}>{swipeSource(swipe, t)}</b></div>
    </Modal>
  );
}

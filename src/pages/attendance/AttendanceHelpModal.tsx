import { Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";

/** English help sections of the Attendance page: a title and its text (both are translation keys). */
export const ATTENDANCE_HELP: { title: string; text: string }[] = [
  { title: "Attendance summary", text: "See your days as a list, a table or a calendar. The arrows move to the previous or next week (month in the calendar). Late and early minutes show only on days you worked." },
  { title: "Check in and check out", text: "Use the shift card to check in and out, and write an optional note when you check out. A day without a check-out shows as a missed check-out." },
  { title: "Request menu", text: "The Request button opens the form for a regularization, an On Duty request or a remote work request without leaving this page." },
  { title: "Regularization", text: "Use it when the real check-in or check-out of a day is wrong or missing. Give the real times and a reason. You can change or withdraw a request while it is pending." },
  { title: "On Duty", text: "Use it for official work away from the usual place, for a full day or a half day. An approved On Duty day counts as a present, payable day." },
  { title: "Remote Work", text: "Use it to work from home for one or more days, or for one half of a day. An approved remote day counts as a normal working day even without a check-in." },
  { title: "Who approves", text: "Admin and HR approve the requests of employees. A request from HR is decided by HR's reporting manager or by the Admin. The number next to a tab is how many requests wait for you." },
  { title: "Shift", text: "The Shift tab shows who works which shift, day by day. Admin and HR can assign shifts." },
];

/** Short in-app help for the Attendance page. */
export function AttendanceHelpModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Modal title={t("Attendance help")} eyebrow={t("Attendance")} size="sm" onClose={onClose} footer={<><span></span><button className="btn btn-gold" onClick={onClose}>{t("Close")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        {ATTENDANCE_HELP.map((section) => (
          <div key={section.title}>
            <b>{t(section.title)}</b>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13.5 }}>{t(section.text)}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}

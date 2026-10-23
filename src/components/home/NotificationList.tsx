
import Link from "@/lib/link";
import { useRouter } from "@/lib/router";
import { useTransition } from "react";
import { markAllNotifications, markNotification } from "@/pages/notification-actions";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import type { InboxItem } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";
import { useLang, useT } from "@/lib/i18n/client";
import { localizeDates, useNotificationText } from "@/lib/notification-text";

/**
 * Notifications, unread first. Opening one marks it read; each can be marked read / unread on its own. Policy
 * notifications stay until the policy is accepted.
 */
export function NotificationList({ items, timeZone, empty }: { items: InboxItem[]; timeZone: string; empty?: string }) {
  const t = useT();
  const lang = useLang();
  const translateNotification = useNotificationText();
  const toast = useToast();
  const router = useRouter();
  const [busy, start] = useTransition();
  const mark = (id: string, read: boolean) => start(async () => {
    const result = await markNotification(id, read);
    if (!result.ok) toast(result.error, "bad");
    router.refresh();
  });
  const open = (notification: InboxItem) => {
    if (!notification.readAt && !notification.sticky) void markNotification(notification.id, true);
    if (notification.link) router.push(notification.link); else router.refresh();
  };
  if (!items.length) return <p className="muted" style={{ margin: "6px 0" }}>{empty ?? t("You're all caught up.")}</p>;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
      {items.map((inboxItem) => {
        const unread = !inboxItem.readAt;
        const text = translateNotification(inboxItem.text);
        return (
          <li key={inboxItem.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flex: "none", background: unread ? "var(--accent)" : "transparent", boxShadow: unread ? "none" : "inset 0 0 0 1px var(--line3)" }}></span>
            <button type="button" onClick={() => open(inboxItem)} style={{ all: "unset", cursor: "pointer", flex: 1, minWidth: 0 }} aria-label={unread ? t("Unread: {text}", { text }) : text}>
              <div style={{ fontWeight: unread ? 600 : 400, fontSize: 13.5, lineHeight: 1.45 }}>{text}</div>
              <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>{localizeDates(lang, formatDateTime(new Date(inboxItem.createdAt), timeZone))}</div>
            </button>
            {inboxItem.sticky ? <Link href="/acknowledge" className="chip warn nodot" style={{ textDecoration: "none" }}>{t("Accept to clear")}</Link>
              : <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => mark(inboxItem.id, unread)} aria-label={unread ? t("Mark as read") : t("Mark as unread")} title={unread ? t("Mark as read") : t("Mark as unread")}>
                <Icon name={unread ? "check" : "eye"} size={13} />
              </button>}
          </li>
        );
      })}
    </ul>
  );
}

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <button type="button" className="btn btn-sm" disabled={disabled || busy} onClick={() => start(async () => {
      const result = await markAllNotifications();
      toast(result.ok ? result.message! : result.error, result.ok ? undefined : "bad");
      router.refresh();
    })}><Icon name="check" size={13} />{t("Mark all read")}</button>
  );
}

/** The dashboard card: the newest notifications, unread first. */
export function NotificationsCard({ items, unread, timeZone, animationIndex }: { items: InboxItem[]; unread: number; timeZone: string; animationIndex: number }) {
  const t = useT();
  return (
    <section className="card pad enter" style={{ ["--i" as string]: animationIndex }} aria-labelledby="notif-card-h">
      <div className="card-h">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 id="notif-card-h">{t("Notifications")}</h3>
          {unread > 0 && <span className="chip gold nodot">{unread} {t("unread")}</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <MarkAllReadButton disabled={!unread} />
          <Link className="btn btn-sm btn-ghost" href="/notifications">{t("View all")}</Link>
        </div>
      </div>
      <NotificationList items={items} timeZone={timeZone} />
    </section>
  );
}

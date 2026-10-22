import Link from "@/lib/link";
import { PageHeader } from "@/components/PageHeader";
import { MarkAllReadButton, NotificationList } from "@/components/home/NotificationList";
import type { InboxPage } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";


/** Every notification of the signed-in user, unread first; 30 a page. */
export default function NotificationsPage() {
  const { user, t, searchParams } = usePage();
  const unreadOnly = searchParams.filter === "unread";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const box = useData<InboxPage>(`/api/notifications?page=${page}${unreadOnly ? "&unread=true" : ""}`);
  if (!box) return <PageLoading />;
  const href = (pageNumber: number, unread = unreadOnly) => `/notifications?${new URLSearchParams({ ...(unread ? { filter: "unread" } : {}), ...(pageNumber > 1 ? { page: String(pageNumber) } : {}) })}`;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Inbox")} title={<>{t("Notifications")}</>} sub={t("Notifications stay here until you read them. Policies to accept stay until you accept them.")}>
        <MarkAllReadButton disabled={!box.unread} />
      </PageHeader>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <div className="seg" role="tablist" aria-label={t("Show")}>
          <Link role="tab" aria-selected={!unreadOnly} className={!unreadOnly ? "on" : ""} href={href(1, false)}>{t("All")}</Link>
          <Link role="tab" aria-selected={unreadOnly} className={unreadOnly ? "on" : ""} href={href(1, true)}>{t("Unread")}{box.unread ? ` (${box.unread})` : ""}</Link>
        </div>
        <span className="tcount">{t(box.total === 1 ? "{n} notification" : "{n} notifications", { n: box.total })}</span>
      </div>
      <section className="card pad enter" style={{ ["--i" as string]: 2 }}>
        <NotificationList items={box.items} timeZone={user.timeZone} empty={unreadOnly ? t("No unread notifications.") : t("No notifications yet.")} />
        {box.pages > 1 && (
          <div className="pager">
            <span>{t("Page {a} of {b}", { a: box.page, b: box.pages })}</span>
            <span style={{ display: "flex", gap: 6 }}>
              {box.page > 1 && <Link className="btn btn-sm" href={href(box.page - 1)}>{t("Newer")}</Link>}
              {box.page < box.pages && <Link className="btn btn-sm" href={href(box.page + 1)}>{t("Older")}</Link>}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

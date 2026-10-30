import Link from "@/lib/link";
import { AnnouncementItem } from "@/components/home/AnnouncementsCard";
import { PageHeader } from "@/components/PageHeader";
import type { Announcement } from "@/lib/api-types";
import { can } from "@/lib/session";
import { PageLoading, useData, usePage } from "@/lib/page";


/** Every active announcement for the signed-in user, pinned first. */
export default function AnnouncementsPage() {
  const { user, t } = usePage();
  const items = useData<Announcement[]>("/api/v1/announcements");
  if (!items) return <PageLoading />;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Company")} title={<em>{t("Announcements")}</em>} sub={t("News from HR and the leadership team.")}>
        {can(user, "announcements.manage") && <Link className="btn" href="/manage-announcements">{t("Manage announcements")}</Link>}
      </PageHeader>
      <section className="card pad enter" style={{ ["--i" as string]: 1 }}>
        {items.map((a) => <AnnouncementItem key={a.id} announcement={a} full />)}
        {!items.length && <div className="empty"><b className="display">{t("No announcements")}</b><span className="muted">{t("When HR posts something for everyone it will appear here.")}</span></div>}
      </section>
    </div>
  );
}

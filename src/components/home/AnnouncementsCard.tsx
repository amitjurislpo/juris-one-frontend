import Link from "@/lib/link";
import { PolicyText } from "@/pages/my-policies/PolicyText";
import { Icon } from "@/components/Icon";
import type { Announcement } from "@/lib/api-types";
import { formatDayMonthYear, INDIA_TIME_ZONE, isoDateIn } from "@/lib/format";
import { useCurrentUser } from "@/lib/session";
import { useT } from "@/lib/i18n/client";

/** One announcement: title, pin, audience, posted date and the plain-text body. */
export function AnnouncementItem({ announcement, full = false }: { announcement: Announcement; full?: boolean }) {
  const t = useT();
  const timeZone = useCurrentUser().user?.timeZone ?? INDIA_TIME_ZONE;
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{announcement.title}</b>
        {announcement.pinned && <span className="chip gold nodot">{t("Pinned")}</span>}
        {announcement.audience !== "ALL" && <span className="chip neutral nodot">{announcement.audience === "IN" ? t("India") : t("US")}</span>}
      </div>
      <div className="faint" style={{ fontSize: 12, margin: "2px 0 6px" }}>{formatDayMonthYear(isoDateIn(announcement.createdAt, timeZone))}{announcement.author ? ` · ${announcement.author}` : ""}{announcement.expiresOn ? ` · ${t("until {date}", { date: formatDayMonthYear(announcement.expiresOn) })}` : ""}</div>
      {full ? <PolicyText body={announcement.body} /> : <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{announcement.body.length > 160 ? `${announcement.body.slice(0, 160).trimEnd()}…` : announcement.body}</p>}
    </div>
  );
}

/** Home card: the latest active announcements (pinned first). Hidden when there are none. */
export function AnnouncementsCard({ items, animationIndex }: { items: Announcement[]; animationIndex: number }) {
  const t = useT();
  if (!items.length) return null;
  return (
    <section className="card pad enter" style={{ ["--i" as string]: animationIndex }}>
      <span className="spot"></span>
      <div className="card-h"><h3><Icon name="bell" size={15} /> {t("Announcements")}</h3><Link className="btn btn-sm btn-ghost" href="/announcements">{t("All")}</Link></div>
      {items.map((a) => <AnnouncementItem key={a.id} announcement={a} />)}
    </section>
  );
}

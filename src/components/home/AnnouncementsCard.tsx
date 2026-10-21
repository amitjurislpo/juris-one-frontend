import Link from "@/lib/link";
import { PolicyText } from "@/pages/my-policies/PolicyText";
import { Icon } from "@/components/Icon";
import type { Announcement } from "@/lib/api-types";
import { formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

/** One announcement: title, pin, audience, posted date and the plain-text body. */
export function AnnouncementItem({ a, full = false }: { a: Announcement; full?: boolean }) {
  const t = useT();
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{a.title}</b>
        {a.pinned && <span className="chip gold nodot">{t("Pinned")}</span>}
        {a.audience !== "ALL" && <span className="chip neutral nodot">{a.audience === "IN" ? t("India") : t("US")}</span>}
      </div>
      <div className="faint" style={{ fontSize: 12, margin: "2px 0 6px" }}>{formatDayMonthYear(a.createdAt.slice(0, 10))}{a.author ? ` · ${a.author}` : ""}{a.expiresOn ? ` · ${t("until {date}", { date: formatDayMonthYear(a.expiresOn) })}` : ""}</div>
      {full ? <PolicyText body={a.body} /> : <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{a.body.length > 160 ? `${a.body.slice(0, 160).trimEnd()}…` : a.body}</p>}
    </div>
  );
}

/** Home card: the latest active announcements (pinned first). Hidden when there are none. */
export function AnnouncementsCard({ items, i }: { items: Announcement[]; i: number }) {
  const t = useT();
  if (!items.length) return null;
  return (
    <section className="card pad enter" style={{ ["--i" as string]: i }}>
      <span className="spot"></span>
      <div className="card-h"><h3><Icon n="bell" s={15} /> {t("Announcements")}</h3><Link className="btn btn-sm btn-ghost" href="/announcements">{t("All")}</Link></div>
      {items.map((a) => <AnnouncementItem key={a.id} a={a} />)}
    </section>
  );
}

import { PageHeader } from "@/components/PageHeader";
import type { Announcement } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { ManageTable, NewAnnouncementButton } from "./ManageClient";


/** HR / the owner: post, edit and unpublish announcements. */
export default function ManageAnnouncementsPage() {
  const { t } = usePage();
  const rows = useData<Announcement[]>("/api/announcements?scope=all");
  if (!rows) return <PageLoading />;

  return (
    <div className="col">
      <PageHeader eyebrow={t("People ops")} title={<>{t("Post")} <em>{t("announcements")}</em></>}
        sub={t("Posting shows the announcement on everyone's Home page and sends each person a notification.")}>
        <NewAnnouncementButton />
      </PageHeader>
      <ManageTable rows={rows} />
    </div>
  );
}

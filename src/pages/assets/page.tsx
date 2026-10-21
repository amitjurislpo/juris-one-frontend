import { PageHeader } from "@/components/PageHeader";
import type { AssetRow } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { todayIn } from "@/lib/format";
import { AddAssetButton, AssetsTable } from "./AssetsClient";


/** HR / the owner: the asset register, who holds what, assign and take back. */
export default function AssetsPage() {
  const { user, t } = usePage();
  const rows = useData<AssetRow[]>("/api/assets");
  const people = useData<{ id: string; code: string; name: string }[]>("/api/assets/assignees");
  if (!rows || !people) return <PageLoading />;
  const today = todayIn(user.timeZone);
  const count = (s: string) => rows.filter((r) => r.status === s).length;

  return (
    <div className="col">
      <PageHeader eyebrow={t("People ops")} title={<>{t("Asset")} <em>{t("tracking")}</em></>}
        sub={t("{total} assets · {assigned} assigned · {available} available · {repair} in repair · {retired} retired", { total: rows.length, assigned: count("ASSIGNED"), available: count("AVAILABLE"), repair: count("IN_REPAIR"), retired: count("RETIRED") })}>
        <AddAssetButton />
      </PageHeader>
      <AssetsTable rows={rows} people={people} today={today} />
    </div>
  );
}

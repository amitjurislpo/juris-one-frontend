import { useState, useTransition } from "react";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Pager, SearchBox, SegmentedFilter } from "@/components/table/Table";
import { useQuery } from "@/components/table/useQuery";
import { toQueryString } from "@/lib/api";
import { formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useData, usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { decideRemoteWork } from "./actions";
import { STATUS_CHIP, STATUS_LABEL } from "./regularization";
import { canDecideRemoteWork, REMOTE_WORK_MAX_NOTE, type RemoteWorkList } from "./remoteWork";
import { RemoteWorkDetailsModal } from "./RemoteWorkDetailsModal";
import { RemoteWorkRequestModal } from "./RemoteWorkRequestModal";

/**
 * The Remote Work Requests tab: my requests (My data) or the team's (Team: everyone for Admin / HR, the direct reports for a manager) with
 * Employee, Period, Duration and Approval status, a details dialog and, for Admin / HR, bulk approve / reject. Filters live in the URL (?scope=, ?status=, ?month=, ?search=, ?page=).
 */
export function RemoteWorkTab() {
  const t = useT();
  const toast = useToast();
  const { user, searchParams } = usePage();
  const readOnly = useReadOnly();
  const { set } = useQuery();
  const canSeeTeam = user.perms.has("appr.reg") || user.hasReports;
  const scope = canSeeTeam && searchParams.scope === "team" ? "team" : "mine";
  const query = { scope, status: searchParams.status ?? "", month: searchParams.month ?? "", search: searchParams.search ?? "", page: searchParams.page ?? "" };
  const data = useData<RemoteWorkList>(`/api/v1/attendance/remote-work-requests${toQueryString(Object.fromEntries(Object.entries(query).filter(([, value]) => value !== "")))}`);
  const [busy, start] = useTransition();
  const [requesting, setRequesting] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  if (!data) return null;

  const team = data.scope === "team";
  const month = searchParams.month ?? "";
  const openedItem = data.items.find((item) => item.id === opened) ?? null;

  const decide = (approve: boolean) => start(async () => {
    const result = await decideRemoteWork({ ids: selected, approve, note: note.trim() || undefined });
    if (!result.ok) { toast(result.error, "bad"); return; }
    const failed = result.data?.filter((outcome) => !outcome.ok) ?? [];
    const done = (result.data?.length ?? 0) - failed.length;
    toast(failed.length ? t("{done} decided, {failed} could not be: {why}", { done, failed: failed.length, why: failed[0].message }) : t("{n} requests decided", { n: done }), failed.length ? "bad" : "ok");
    setSelected([]);
    setRejecting(false);
    setNote("");
  });

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="toolbar enter" style={{ flexWrap: "wrap", gap: 10 }}>
        {canSeeTeam && <SegmentedFilter name="scope" dflt="mine" label={t("Whose requests")} options={[{ value: "mine", label: t("My data") }, { value: "team", label: t("Team") }]} />}
        <SegmentedFilter name="status" dflt="ALL" label={t("Approval status")} options={[
          { value: "ALL", label: t("All") }, { value: "PENDING", label: t("Pending") }, { value: "APPROVED", label: t("Approved") }, { value: "DECLINED", label: t("Rejected") }, { value: "CANCELLED", label: t("Cancelled") },
        ]} />
        <label className="field" style={{ margin: 0 }}><span className="sr-only">{t("Month")}</span>
          <input type="month" value={month} aria-label={t("Month")} onChange={(e) => set({ month: e.target.value || null })} />
        </label>
        {team && <SearchBox placeholder={t("Search by employee")} label={t("Search requests")} />}
        <span style={{ flex: 1 }}></span>
        {!readOnly && <button className="btn btn-gold" onClick={() => setRequesting(true)}>{t("Add request")}</button>}
      </div>

      {selected.length > 0 && !readOnly && (
        <div className="row card pad" style={{ gap: 10, alignItems: "center" }}>
          <b>{t("{n} selected", { n: selected.length })}</b>
          <span style={{ flex: 1 }}></span>
          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRejecting(true)}>{t("Reject")}</button>
          <button className="btn btn-gold btn-sm" disabled={busy} onClick={() => decide(true)}>{t("Approve")}</button>
        </div>
      )}

      {data.items.length === 0 ? (
        <div className="empty enter"><b>{t("No remote work requests have been raised currently")}</b><span className="muted">{t("Nothing matches these filters.")}</span></div>
      ) : (
        <section className="card enter">
          <div className="table-wrap">
            <table className="t">
              <thead><tr>
                {data.canDecide && <th style={{ width: 32 }}></th>}
                <th>{t("Employee")}</th><th>{t("Period")}</th><th>{t("Duration")}</th><th>{t("Reason")}</th><th>{t("Approval status")}</th>
              </tr></thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} onClick={() => setOpened(item.id)} style={{ cursor: "pointer" }}>
                    {data.canDecide && <td onClick={(e) => e.stopPropagation()}>{canDecideRemoteWork(item, data.canDecide, user.id) && <input type="checkbox" aria-label={t("Select {who}", { who: item.employeeName })} checked={selected.includes(item.id)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />}</td>}
                    <td><b>{item.employeeName}</b><div className="faint" style={{ fontSize: 12 }}>{item.employeeCode}</div></td>
                    <td className="num">{item.fromDate === item.toDate ? formatDayMonthYear(item.fromDate) : `${formatDayMonthYear(item.fromDate)} – ${formatDayMonthYear(item.toDate)}`}</td>
                    <td className="num">{item.days === 1 ? t("1 day") : t("{n} days", { n: item.days })}</td>
                    <td>{item.reason}</td>
                    <td><span className={`chip ${STATUS_CHIP[item.status] ?? "neutral"}`}>{t(STATUS_LABEL[item.status] ?? item.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="faint" style={{ fontSize: 12.5 }}>{t("Total record count: {n}", { n: data.total })}</div>
      <Pager page={data.page} take={data.pageSize} total={data.total} />

      {requesting && <RemoteWorkRequestModal onClose={() => setRequesting(false)} />}
      {openedItem && <RemoteWorkDetailsModal item={openedItem} canDecide={data.canDecide} onClose={() => setOpened(null)} />}
      {rejecting && (
        <ConfirmDialog title={t("Reject requests")} danger confirm={t("Reject")} busy={busy || !note.trim()} onClose={() => setRejecting(false)} onConfirm={() => decide(false)}
          body={t("The employees will see these remarks.")}>
          <label className="field" style={{ marginTop: 14 }}>{t("Remarks")} *<input value={note} maxLength={REMOTE_WORK_MAX_NOTE} onChange={(e) => setNote(e.target.value)} /></label>
        </ConfirmDialog>
      )}
    </div>
  );
}

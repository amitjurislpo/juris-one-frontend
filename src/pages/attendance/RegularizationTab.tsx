import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Pager, SearchBox, SegmentedFilter } from "@/components/table/Table";
import { useQuery } from "@/components/table/useQuery";
import { toQueryString } from "@/lib/api";
import { formatDayMonthYear, todayIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useData, usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { decideRegularizations } from "./actions";
import { DAY_STATUS_LABEL, formatMinutes, KIND_LABEL, STATUS_CHIP, STATUS_LABEL, type RegularizationItem, type RegularizationList, type RegularizationRules } from "./regularization";
import { RegularizationDetailsModal } from "./RegularizationDetailsModal";
import { RegularizationRequestModal } from "./RegularizationRequestModal";
import { RegularizationRulesModal } from "./RegularizationRulesModal";
import { defaultRequestScope, usePendingCounts } from "./pendingCounts";

/**
 * The Regularization tab: my requests (My data) or everyone's (Team, Admin / HR only) with Old and New hours and status, the approval
 * status, a details dialog, bulk approve / reject, CSV export and the settings. Filters live in the URL (?scope=, ?status=, ?month=, ?search=, ?page=).
 */
export function RegularizationTab() {
  const t = useT();
  const toast = useToast();
  const { user, searchParams } = usePage();
  const readOnly = useReadOnly();
  const { get, set } = useQuery();
  const counts = usePendingCounts();
  const isApprover = user.perms.has("appr.reg");
  const canSeeAll = isApprover || (counts?.managesHr ?? false); // Admin / HR see everyone; the manager of an HR person sees that person's requests
  const defaultScope = defaultRequestScope(canSeeAll, counts?.regularization);
  const scope = canSeeAll && (searchParams.scope ?? defaultScope) === "team" ? "all" : "mine";
  const query = { scope, status: searchParams.status ?? "", month: searchParams.month ?? "", search: searchParams.search ?? "", page: searchParams.page ?? "" };
  const data = useData<RegularizationList>(`/api/v1/attendance/regularizations${toQueryString(Object.fromEntries(Object.entries(query).filter(([, value]) => value !== "")))}`);
  const rules = useData<RegularizationRules>("/api/v1/attendance/regularization-rules");
  const [busy, start] = useTransition();
  const [requesting, setRequesting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  if (!data || !rules) return null;

  const team = data.scope === "all";
  const today = todayIn(user.timeZone);
  const month = searchParams.month ?? "";
  const openedItem = data.items.find((item) => item.id === opened) ?? null;
  const decidable = (item: RegularizationItem) => data.decidable.includes(item.id); // the server's approval rule
  const status = (value: string | null) => (value ? t(DAY_STATUS_LABEL[value] ?? value) : "—");
  const exportQuery = toQueryString(Object.fromEntries(Object.entries({ status: query.status, month: query.month, search: query.search }).filter(([, value]) => value !== "")));

  const decide = (approve: boolean) => start(async () => {
    const result = await decideRegularizations({ ids: selected, approve, note: note.trim() || undefined });
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
        {canSeeAll && <SegmentedFilter name="scope" dflt={defaultScope} label={t("Whose requests")} options={[{ value: "mine", label: t("My data") }, { value: "team", label: t("Team") }]} />}
        <SegmentedFilter name="status" dflt="ALL" label={t("Approval status")} options={[
          { value: "ALL", label: t("All") }, { value: "PENDING", label: t("Pending") }, { value: "APPROVED", label: t("Approved") }, { value: "DECLINED", label: t("Rejected") }, { value: "CANCELLED", label: t("Cancelled") },
        ]} />
        <label className="field" style={{ margin: 0 }}><span className="sr-only">{t("Month")}</span>
          <input type="month" value={month} max={today.slice(0, 7)} aria-label={t("Month")} onChange={(e) => set({ month: e.target.value || null })} />
        </label>
        {team && <SearchBox placeholder={t("Search by employee")} label={t("Search requests")} />}
        <span style={{ flex: 1 }}></span>
        {team && isApprover && <a className="btn btn-sm btn-ghost" href={`/api/v1/attendance/regularizations/export${exportQuery}`} download><Icon name="download" size={14} /> {t("Export CSV")}</a>}
        {team && isApprover && !readOnly && <button className="btn btn-sm btn-ghost" onClick={() => setShowSettings(true)}>{t("Settings")}</button>}
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
        <div className="empty enter"><b>{t("No regularization requests")}</b><span className="muted">{t("Nothing matches these filters.")}</span></div>
      ) : (
        <section className="card enter">
          <div className="table-wrap">
            <table className="t">
              <thead><tr>
                {team && <th style={{ width: 32 }}></th>}
                {team && <th>{t("Employee")}</th>}
                <th>{t("Worked day")}</th><th>{t("Type")}</th><th>{t("Hours (old → new)")}</th><th>{t("Status (old → new)")}</th><th>{t("Reason")}</th><th>{t("Approval status")}</th>
              </tr></thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} onClick={() => setOpened(item.id)} style={{ cursor: "pointer" }}>
                    {team && <td onClick={(e) => e.stopPropagation()}>{decidable(item) && <input type="checkbox" aria-label={t("Select {who}", { who: item.employeeName })} checked={selected.includes(item.id)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />}</td>}
                    {team && <td><b>{item.employeeName}</b><div className="faint" style={{ fontSize: 12 }}>{item.employeeCode}</div></td>}
                    <td className="num">{formatDayMonthYear(item.date)}</td>
                    <td>{t(KIND_LABEL[item.kind] ?? item.kind)}</td>
                    <td className="num">{formatMinutes(item.oldMinutes)} → {formatMinutes(item.newMinutes)}</td>
                    <td>{status(item.oldStatus)} → {status(item.newStatus)}</td>
                    <td>{item.reason ?? "—"}</td>
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

      {requesting && <RegularizationRequestModal date={get("date", today)} onClose={() => setRequesting(false)} />}
      {openedItem && <RegularizationDetailsModal item={openedItem} canDecide={decidable(openedItem)} onClose={() => setOpened(null)} />}
      {showSettings && <RegularizationRulesModal rules={rules} onClose={() => setShowSettings(false)} />}
      {rejecting && (
        <ConfirmDialog title={t("Reject requests")} danger confirm={t("Reject")} busy={busy || !note.trim()} onClose={() => setRejecting(false)} onConfirm={() => decide(false)}
          body={t("The employees will see these remarks.")}>
          <label className="field" style={{ marginTop: 14 }}>{t("Remarks")} *<input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></label>
        </ConfirmDialog>
      )}
    </div>
  );
}

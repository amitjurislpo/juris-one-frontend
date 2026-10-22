import { PageHeader } from "@/components/PageHeader";
import { SearchBox, SegmentedFilter } from "@/components/table/Table";
import { PageLoading, useData, usePage } from "@/lib/page";
import { toQueryString } from "@/lib/api";
import { avatarColorClass, initials } from "@/lib/format";
import { DecideButtons } from "./ApprovalsClient";



export default function ApprovalsPage() {
  const { t, searchParams } = usePage();
  const data = useData<{
    tab: "leave" | "regularizations"; search: string; canLeave: boolean; canApproveRegularizations: boolean; leaveCount: number; regularizationCount: number;
    leaveCards: { id: string; name: string; department: string; type: string; span: string; days: number; part: string; reason: string | null; impact: string; overlap: number }[];
    regularizationCards: { id: string; name: string; department: string; kind: string; date: string; detail: string; reason: string | null }[];
    decided: { id: string; when: string; employeeName: string; what: string; approved: boolean; decidedBy: string }[];
  }>(`/api/approvals${toQueryString(searchParams)}`);
  if (!data) return <PageLoading />;
  const { tab, search, canLeave, canApproveRegularizations, leaveCount, regularizationCount, leaveCards, regularizationCards, decided } = data;

  const total = leaveCount + regularizationCount;
  const tabs = [...(canLeave ? [{ value: "leave", label: t("Leave · {n}", { n: leaveCount }) }] : []), ...(canApproveRegularizations ? [{ value: "regularizations", label: t("Attendance · {n}", { n: regularizationCount }) }] : [])];

  return (
    <div className="col" style={{ gap: 24 }}>
      <PageHeader eyebrow={t("Approvals")} title={<><span className="num">{total}</span> {total === 1 ? t("request") : t("requests")}</>} emphasis={t("awaiting you")}
        sub={tab === "regularizations" ? t("Regularizations go to HR, Finance and Admin — the first decision counts and updates LOP in payroll.") : t("Approving leave updates the employee's balance and calendar instantly.")}>
        {tabs.length > 1 && <SegmentedFilter name="tab" dflt={canLeave ? "leave" : "regularizations"} label={t("Queue")} options={tabs} />}
      </PageHeader>
      <div className="toolbar enter"><SearchBox placeholder={t("Search by employee")} label={t("Search requests")} /></div>
      <div className="col" style={{ gap: 14 }}>
        {tab === "leave" && leaveCards.map((leaveCard) => (
          <article className="card req enter" key={leaveCard.id}>
            <span className="spot" aria-hidden="true"></span>
            <span className={`avatar lg ${avatarColorClass(initials(leaveCard.name))}`}>{initials(leaveCard.name)}</span>
            <div className="body">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}><b style={{ fontSize: 16 }}>{leaveCard.name}</b><span className="chip info">{t(leaveCard.type)}</span><span className="faint" style={{ fontSize: 12.5 }}>{leaveCard.department}</span></div>
              <span style={{ fontSize: 14.5 }}>{leaveCard.span} · {leaveCard.days === 1 ? t("{n} day", { n: leaveCard.days }) : t("{n} days", { n: leaveCard.days })} <span className="faint">({t(leaveCard.part)})</span></span>
              <span className="muted" style={{ fontSize: 13.5 }}>{leaveCard.reason ? `“${leaveCard.reason}”` : t("No reason given")}</span>
              <span className="faint" style={{ fontSize: 12.5 }}>{leaveCard.impact}</span>
              {leaveCard.overlap > 0 && <span className="chip warn" style={{ alignSelf: "flex-start" }}>{leaveCard.overlap > 1 ? t("{n} overlapping requests in {dept}", { n: leaveCard.overlap, dept: leaveCard.department }) : t("{n} overlapping request in {dept}", { n: leaveCard.overlap, dept: leaveCard.department })}</span>}
            </div>
            <DecideButtons id={leaveCard.id} kind="leave" who={leaveCard.name} />
          </article>
        ))}
        {tab === "regularizations" && regularizationCards.map((regularizationCard) => (
          <article className="card req enter" key={regularizationCard.id}>
            <span className="spot" aria-hidden="true"></span>
            <span className={`avatar lg ${avatarColorClass(initials(regularizationCard.name))}`}>{initials(regularizationCard.name)}</span>
            <div className="body">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}><b style={{ fontSize: 16 }}>{regularizationCard.name}</b><span className="chip gold">{t(regularizationCard.kind)}</span><span className="faint" style={{ fontSize: 12.5 }}>{t("{dept} · sent to HR, Finance & Admin", { dept: regularizationCard.department })}</span></div>
              <span style={{ fontSize: 14.5 }}>{regularizationCard.date} · {regularizationCard.detail}</span>
              <span className="muted" style={{ fontSize: 13.5 }}>{regularizationCard.reason ? `“${regularizationCard.reason}”` : t("No reason given")}</span>
            </div>
            <DecideButtons id={regularizationCard.id} kind="reg" who={regularizationCard.name} />
          </article>
        ))}
        {((tab === "leave" && !leaveCards.length) || (tab === "regularizations" && !regularizationCards.length)) && <div className="empty enter"><b>{t("All clear")}</b><span className="muted">{search ? t("No pending request matches that name.") : t("Nothing waiting in this queue.")}</span></div>}
      </div>
      {decided.length > 0 && (
        <section className="card pad enter">
          <span className="spot" aria-hidden="true"></span>
          <div className="card-h"><h3>{t("Decided · last 30 days")}</h3></div>
          <div className="list">
            {decided.map((decision) => (
              <div className="it" key={decision.id}>
                <span style={{ flex: 1 }}><b>{decision.employeeName}</b> <span className="muted">· {decision.what}</span><div className="faint" style={{ fontSize: 12 }}>{decision.when}</div></span>
                <span className={`chip ${decision.approved ? "ok" : "bad"}`}>{decision.approved ? t("Approved") : t("Declined")} · {decision.decidedBy}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

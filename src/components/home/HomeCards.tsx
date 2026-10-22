import Link from "@/lib/link";
import { Icon } from "@/components/Icon";
import { formatDayMonth, formatMonthLabel } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { Avatar } from "@/components/Avatar";

const LCHIP: Record<string, string> = { PENDING: "warn", APPROVED: "ok", DECLINED: "bad", CANCELLED: "neutral" };
const LLABEL: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", DECLINED: "Declined", CANCELLED: "Cancelled" };

/** Home side column: cards that appear by permission (REQUIREMENTS §5.12). No salary figures. */
/** Permission-driven Home cards, from /api/home (salary is never included). */
export interface HomeCardsData {
  myLeaves: { id: string; type: string; from: string; to: string; days: number; status: string }[] | null;
  team: { id: string; photo?: number | null; name: string; title: string; status: { label: string; tone: "ok" | "info" | "warn" | "gold" | "neutral" } }[] | null;
  approvals: { leaveToo: boolean; count: number } | null;
  payroll: { month: string; status: "Closed" | "Approved" | "In review"; proofs: number | null; regularizations: number } | null;
  payslip: { month: string; ready: boolean } | null;
}

export function HomeCards({ cards, firstCardIndex }: { cards: HomeCardsData; firstCardIndex: number }) {
  const t = useT();
  let cardIndex = firstCardIndex;
  return (
    <>
      {cards.myLeaves && (
        <section className="card pad enter" style={{ ["--i" as string]: cardIndex++ }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("My leave requests")}</h3><Link className="btn btn-sm btn-ghost" href="/leave">{t("View all")}</Link></div>
          <div className="list">
            {!cards.myLeaves.length && <div className="faint" style={{ fontSize: 13, padding: "6px 0" }}>{t("No leave requests yet.")}</div>}
            {cards.myLeaves.map((leave) => (
              <div className="it" key={leave.id}>
                <span style={{ width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--hover)", color: "var(--muted)", flex: "none" }}><Icon name="cal" size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 13.5, fontWeight: 600 }}>{t(leave.type)}</b><div className="faint" style={{ fontSize: 12.5 }}>{formatDayMonth(leave.from)}{leave.to !== leave.from ? ` – ${formatDayMonth(leave.to)}` : ""} · {leave.days}d</div></div>
                <span className={`chip ${LCHIP[leave.status]}`}>{t(LLABEL[leave.status])}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {cards.team && (
        <section className="card pad enter" style={{ ["--i" as string]: cardIndex++ }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("Your team right now")}</h3><Link className="btn btn-sm btn-ghost" href="/team">{t("Open")}</Link></div>
          <div className="list">
            {cards.team.map((member) => (
              <div className="it" key={member.id}>
                <Avatar id={member.id} name={member.name} photo={member.photo} />
                <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 13.5, fontWeight: 600 }}>{member.name}</b><div className="faint" style={{ fontSize: 12 }}>{member.title}</div></div>
                <span className={`chip ${member.status.tone}`}>{t(member.status.label)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {cards.approvals && (
        <section className="card pad enter" style={{ ["--i" as string]: cardIndex++ }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("Approvals")}</h3><span className="chip gold nodot">{cards.approvals.leaveToo ? t("Leave & attendance") : t("Attendance")}</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span className="num" style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-.05em", lineHeight: 1 }}>{cards.approvals.count}</span><span className="muted">{cards.approvals.count === 1 ? t("request waiting") : t("requests waiting")}</span></div>
          <p className="muted" style={{ margin: "10px 0 16px", fontSize: 13.5 }}>{cards.approvals.leaveToo ? t("Leave and regularization requests from every team.") : t("Attendance regularizations that affect payroll.")}</p>
          <Link className="btn btn-gold" style={{ width: "100%" }} href="/approvals">{t("Review now")}<Icon name="arrow" size={15} /></Link>
        </section>
      )}

      {cards.payroll && (
        <section className="card pad enter" style={{ ["--i" as string]: cardIndex++ }}>
          <span className="spot"></span>
          <div className="card-h"><h3>{t("Payroll")} · {formatMonthLabel(cards.payroll.month).split(" ")[0]}</h3><span className={`chip ${cards.payroll.status === "Closed" ? "ok" : "warn"}`}>{t(cards.payroll.status)}</span></div>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13.5 }}>
            {cards.payroll.proofs !== null && `${t("{n} investment proof(s) waiting for verification.", { n: cards.payroll.proofs })} `}
            {t("{n} regularization(s) may change LOP.", { n: cards.payroll.regularizations })}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Link className="btn btn-gold" style={{ flex: 1 }} href="/payroll">{t("Open payroll")}</Link>
            {cards.payroll.proofs !== null && <Link className="btn" href="/proofs">{t("Proofs")}</Link>}
          </div>
        </section>
      )}

      {cards.payslip && (
        <section className="card pad enter" style={{ ["--i" as string]: cardIndex++, display: "flex", gap: 14, alignItems: "center" }}>
          <span className="spot"></span>
          <span className="kpi-ico" style={{ background: "var(--accentsoft)", color: "var(--accent)" }}><Icon name="doc" size={18} /></span>
          <div style={{ flex: 1 }}><h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{formatMonthLabel(cards.payslip.month).split(" ")[0]} {t("payslip")}</h3><div className="faint" style={{ fontSize: 12.5 }}>{cards.payslip.ready ? t("Ready to view and download") : t("Available once Finance closes payroll")}</div></div>
          <Link className="btn btn-sm" href="/payslips">{t("Open")}</Link>
        </section>
      )}
    </>
  );
}

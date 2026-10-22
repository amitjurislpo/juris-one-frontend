
import { useRouter } from "@/lib/router";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { formatRupees } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { DECLARATION_SECTIONS } from "@/lib/tax/catalogue";
import { saveItem, saveProfile, setRegime, submitForVerification } from "./actions";

export interface ItemView { id: string; key: string; amount: number; status: string; proofName: string | null; reason: string | null }

const CHIP: Record<string, string> = { DRAFT: "neutral", PENDING: "warn", APPROVED: "ok", REJECTED: "bad" };
const LABEL: Record<string, string> = { DRAFT: "Draft", PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };
const formatWholeRupees = (rupees: number) => formatRupees(rupees * 100);

export function DeclareClient(props: {
  regime: "NEW" | "OLD"; overridden: boolean; canChangeRegime: boolean; windowOpen: boolean; windowText: string;
  newTax: number; oldTax: number; monthlyTds: number; epf: number;
  profile: { metro: boolean; parentsSenior: boolean; landlordPan: string }; items: ItemView[];
}) {
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [openSec, setOpenSec] = useState("HRA");
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(props.items.map((i) => [i.key, i.amount ? String(i.amount) : ""])));
  const [prof, setProf] = useState(props.profile);
  const [uploading, setUploading] = useState<string | null>(null);
  const item = (itemKey: string) => props.items.find((i) => i.key === itemKey);
  const better = props.newTax <= props.oldTax ? "NEW" : "OLD";
  const counts = { pending: props.items.filter((i) => i.status === "PENDING").length, approved: props.items.filter((i) => i.status === "APPROVED").length, rejected: props.items.filter((i) => i.status === "REJECTED").length };
  const secTotal = (declarationSection: (typeof DECLARATION_SECTIONS)[number]) => declarationSection.items.reduce((runningTotal, declarationItem) => runningTotal + (declarationItem.auto ? props.epf : Number(draft[declarationItem.field] || 0)), 0);
  const readOnly = useReadOnly();
  const locked = !props.windowOpen || readOnly;

  const act = (action: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    const res = await action();
    if (!res.ok) toast(res.error!, "bad");
    else if (res.message) toast(res.message);
    router.refresh();
  });

  const upload = async (key: string, file: File) => {
    setUploading(key);
    const formData = new FormData();
    formData.set("item", key);
    formData.set("file", file);
    try {
      const res = await fetch("/api/declarations/proofs", { method: "POST", body: formData });
      const j = await res.json();
      if (!res.ok) toast(j.detail ?? j.error ?? t("Upload failed"), "bad");
      else toast(t("Attached {name}", { name: j.data.name }));
      router.refresh();
    } finally { setUploading(null); }
  };

  const regimeCard = (cardRegime: "NEW" | "OLD", title: string, blurb: string, tax: number) => (
    <button type="button" className={`card regime${props.regime === cardRegime ? " on" : ""}`} aria-pressed={props.regime === cardRegime} disabled={busy || readOnly || props.overridden || !props.canChangeRegime}
      onClick={() => act(() => setRegime(cardRegime))}>
      <span className="spot"></span>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}><b>{title}</b>{better === cardRegime && <span className="chip ok nodot">{t("Saves more")}</span>}</span>
      <span className="muted" style={{ fontSize: 13 }}>{blurb}</span>
      <span className="display" style={{ fontSize: 32 }}>{formatWholeRupees(tax)}<span className="faint" style={{ fontSize: 13, fontFamily: "var(--font-geist)" }}> {t("/ year est.")}</span></span>
    </button>
  );

  return (
    <>
      <div className="regimes enter" style={{ ["--i" as string]: 1 }}>
        {regimeCard("NEW", t("New regime"), t("Lower slab rates, ₹75,000 standard deduction, no investment proofs needed."), props.newTax)}
        {regimeCard("OLD", t("Old regime"), t("Claim HRA, 80C, 80D, home loan and more — proofs required."), props.oldTax)}
      </div>
      <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
        {props.overridden ? `${t("Finance has set your regime.")} ` : ""}{t("TDS this month:")} <b className="num">{formatWholeRupees(props.monthlyTds)}</b> {t("(approved proofs only).")} {props.windowText}
      </p>

      {props.regime === "NEW" ? (
        <section className="card pad enter" style={{ ["--i" as string]: 2, display: "flex", gap: 16, alignItems: "center" }}>
          <span className="spot"></span>
          <span className="kpi-ico" style={{ background: "var(--okbg)", color: "var(--ok)" }}><Icon name="check" size={18} /></span>
          <div><b>{t("You're on the new regime")}</b><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>{t("Nothing to declare. Your TDS uses the ₹75,000 standard deduction and new-regime slabs.")}</div></div>
        </section>
      ) : (
        <>
          <div className="row enter" style={{ ["--i" as string]: 2, alignItems: "center" }}>
            <span className="chip warn">{t("{n} pending", { n: counts.pending })}</span><span className="chip ok">{t("{n} approved", { n: counts.approved })}</span>{counts.rejected > 0 && <span className="chip bad">{t("{n} rejected", { n: counts.rejected })}</span>}
            <span style={{ flex: 1 }}></span>
            {!readOnly && <button className="btn btn-gold" disabled={busy || locked} onClick={() => act(submitForVerification)}><Icon name="upload" size={15} />{t("Submit for verification")}</button>}
          </div>
          {DECLARATION_SECTIONS.map((declarationGroup, sectionIndex) => (
            <section key={declarationGroup.section} className="card enter decl" style={{ ["--i" as string]: sectionIndex + 3 }}>
              <span className="spot"></span>
              <button type="button" className="decl-h" onClick={() => setOpenSec(openSec === declarationGroup.section ? "" : declarationGroup.section)} aria-expanded={openSec === declarationGroup.section}>
                <span className="chip gold nodot" style={{ minWidth: 86, justifyContent: "center" }}>{declarationGroup.section}</span>
                <span style={{ flex: 1, textAlign: "left" }}><b>{t(declarationGroup.title)}</b>{declarationGroup.cap && <span className="faint" style={{ fontSize: 12.5 }}> · {t("limit {amount}", { amount: formatWholeRupees(declarationGroup.cap) })}</span>}</span>
                <b className="num">{formatWholeRupees(secTotal(declarationGroup))}</b>
                <Icon name={openSec === declarationGroup.section ? "chevD" : "chevR"} size={16} />
              </button>
              {openSec === declarationGroup.section && (
                <div className="decl-b">
                  <p className="faint" style={{ margin: "0 0 12px", fontSize: 12.5 }}>{t(declarationGroup.note)}</p>
                  {declarationGroup.section === "HRA" && (
                    <div className="row" style={{ gap: 16, alignItems: "center", marginBottom: 10 }}>
                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}>
                        <input type="checkbox" checked={prof.metro} disabled={locked} style={{ accentColor: "var(--accent)" }} onChange={(e) => { const updatedProfile = { ...prof, metro: e.target.checked }; setProf(updatedProfile); act(() => saveProfile(updatedProfile)); }} />
                        {t("I live in a metro city (Delhi, Mumbai, Kolkata, Chennai)")}
                      </label>
                      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{t("Landlord PAN")}
                        <input value={prof.landlordPan} maxLength={10} disabled={locked} placeholder={t("needed above ₹1,00,000/yr")} style={{ width: 210, textTransform: "uppercase" }} onChange={(e) => setProf({ ...prof, landlordPan: e.target.value.toUpperCase() })} onBlur={() => act(() => saveProfile(prof))} />
                      </label>
                    </div>
                  )}
                  {declarationGroup.section === "80D" && (
                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, marginBottom: 10 }}>
                      <input type="checkbox" checked={prof.parentsSenior} disabled={locked} style={{ accentColor: "var(--accent)" }} onChange={(e) => { const updatedProfile = { ...prof, parentsSenior: e.target.checked }; setProf(updatedProfile); act(() => saveProfile(updatedProfile)); }} />
                      {t("My parents are senior citizens (limit ₹50,000)")}
                    </label>
                  )}
                  {declarationGroup.items.map((sectionItem) => {
                    const cur = item(sectionItem.field);
                    return (
                      <div className="decl-row" key={sectionItem.field}>
                        <span style={{ flex: "1 1 220px" }}>
                          <b style={{ fontWeight: 500 }}>{t(sectionItem.label)}</b>
                          {sectionItem.hint && <span className="faint" style={{ display: "block", fontSize: 12 }}>{t(sectionItem.hint)}</span>}
                          {cur?.status === "REJECTED" && cur.reason && <span style={{ display: "block", fontSize: 12, color: "var(--bad)" }}>{t("Rejected: {reason}", { reason: cur.reason })}</span>}
                        </span>
                        {sectionItem.auto ? (
                          <><b className="num">{formatWholeRupees(props.epf)}</b><span className="chip ok nodot">{t("From payroll")}</span></>
                        ) : (
                          <>
                            <label className="money"><span>₹</span>
                              <input type="number" min={0} step={1} value={draft[sectionItem.field] ?? ""} placeholder="0" aria-label={t("{label} amount", { label: t(sectionItem.label) })} disabled={locked || cur?.status === "PENDING"}
                                onChange={(e) => setDraft({ ...draft, [sectionItem.field]: e.target.value })}
                                onBlur={() => { const declaredAmount = Math.round(Number(draft[sectionItem.field] || 0)); if (declaredAmount !== (cur?.amount ?? 0)) act(() => saveItem({ key: sectionItem.field, amount: declaredAmount })); }} />
                            </label>
                            {!readOnly && <label className={`btn btn-sm${locked || cur?.status === "PENDING" ? " disabled" : ""}`} style={{ cursor: "pointer" }} title={cur?.proofName ?? undefined}>
                              <Icon name="upload" size={14} />{uploading === sectionItem.field ? t("Uploading…") : cur?.proofName ? t("Replace") : t("Proof")}
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" style={{ display: "none" }} disabled={locked || cur?.status === "PENDING"} aria-label={t("Upload proof for {label}", { label: t(sectionItem.label) })}
                                onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(sectionItem.field, file); e.target.value = ""; }} />
                            </label>}
                            {cur?.proofName && <a className="linkish" style={{ fontSize: 12.5 }} href={`/api/declarations/proofs/${cur.id}`} target="_blank" rel="noopener">{cur.proofName}</a>}
                            <span className={`chip ${cur ? CHIP[cur.status] : "neutral"}`} style={{ minWidth: 84, justifyContent: "center" }}>{cur && (cur.amount || cur.proofName) ? t(LABEL[cur.status]) : t("Not declared")}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </>
  );
}

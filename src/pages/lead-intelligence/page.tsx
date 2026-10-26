import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { usePage } from "@/lib/page";

/** LIE (Lead Intelligence Engine): not built yet, so the page only says it is coming. */
export default function LeadIntelligencePage() {
  const { t } = usePage();

  return (
    <div className="col">
      <PageHeader eyebrow={t("Lead Intelligence Engine")} title={<>{t("Lead Intelligence Engine")}</>} sub="LIE" />
      <section className="card enter" style={{ ["--i" as string]: 1, padding: "48px 28px", textAlign: "center" }}>
        <span style={{ width: 56, height: 56, margin: "0 auto 16px", background: "var(--accentsoft)", color: "var(--accent)", display: "grid", placeItems: "center", borderRadius: 14 }}>
          <Icon name="search" size={26} />
        </span>
        <span className="chip gold nodot" style={{ marginBottom: 12 }}>{t("Coming soon")}</span>
        <h2 className="display" style={{ fontSize: 34, margin: "0 0 10px" }}>{t("Something new is on its way")}</h2>
        <p className="muted" style={{ maxWidth: 520, margin: "0 auto" }}>
          {t("LIE is being built and will appear right here. There is nothing to set up: you will be able to use it as soon as it launches.")}
        </p>
      </section>
    </div>
  );
}

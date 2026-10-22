import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import type { T } from "@/lib/i18n/translate";
import Link from "@/lib/link";
import { usePathname, useRouter } from "@/lib/router";

/** Where each role lands after sign-in: these pages have nothing to go back to. */
const LANDING = ["/", "/home", "/overview", "/platform"];

/** Prototype page header: eyebrow, Balkind display title with gradient <em>, subtitle, actions. Every page but a landing page gets a Back button: to `back` (the parent page) when given, else to the previous page. */
export function PageHeader({ back, eyebrow, title, emphasis, after, sub, children }: { back?: string; eyebrow: React.ReactNode; title?: React.ReactNode; emphasis?: React.ReactNode; after?: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const goBack = () => { if ((window.history.state as { idx?: number } | null)?.idx) router.back(); else router.push("/"); };
  return (
    <div className="page-h enter">
      <div>
        <div className="page-top">
          {back ? (
            <Link href={back} className="back-btn"><Icon name="chevL" size={14} />{t("Back")}</Link>
          ) : !LANDING.includes(path) && (
            <button type="button" className="back-btn" onClick={goBack}><Icon name="chevL" size={14} />{t("Back")}</button>
          )}
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h1 className="display">
          {title}
          {title && emphasis ? " " : null}
          {emphasis && <em>{emphasis}</em>}
          {after}
        </h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{children}</div>}
    </div>
  );
}

/** Placeholder for modules that land in a later build phase. */
export function ComingInPhase({ phase, what, t }: { phase: number; what: string; t: T }) {
  return (
    <div className="empty enter" style={{ ["--i" as string]: 2 }}>
      <b className="display">{t("Arrives in phase {phase}", { phase })}</b>
      <span className="muted">{what}</span>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import { REQUEST_LABEL, type RequestKind } from "./requestKinds";

/**
 * The "Request" button of the Attendance summary: a menu of the requests that can be raised from this page (regularization, On Duty, remote
 * work). Choosing one opens its form on the same page. Arrow keys move, Esc closes and gives the focus back to the button.
 */
export function RequestMenu({ kinds, onChoose }: { kinds: RequestKind[]; onChoose: (kind: RequestKind) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    wrap.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); button.current?.focus(); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  };

  return (
    <div className="menu-anchor" style={{ position: "relative" }} ref={wrap} onKeyDown={onKey}>
      <button ref={button} type="button" className="btn btn-gold" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen(!open)}>
        {t("Request")} <Icon name="chevD" size={14} />
      </button>
      {open && (
        <div className="menu" id={menuId} role="menu" aria-label={t("Request")} style={{ minWidth: 200 }}>
          {kinds.map((kind) => (
            <button key={kind} type="button" role="menuitem" onClick={() => { setOpen(false); onChoose(kind); }}>{t(REQUEST_LABEL[kind])}</button>
          ))}
        </div>
      )}
    </div>
  );
}

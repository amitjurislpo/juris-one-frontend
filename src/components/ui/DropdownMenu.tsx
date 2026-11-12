import { useEffect, useId, useRef, useState } from "react";

/**
 * A button that opens a menu of `role="menuitem"` buttons or links (the children, given a `close` function). Click outside or Esc closes it
 * (Esc gives the focus back to the button), arrow keys move between the items and the first item is focused when it opens.
 */
export function DropdownMenu({ trigger, triggerClassName, triggerLabel, menuLabel, minWidth = 200, children }: {
  trigger: React.ReactNode; triggerClassName: string; triggerLabel?: string; menuLabel: string; minWidth?: number; children: (close: () => void) => React.ReactNode;
}) {
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
    if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); button.current?.focus(); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  };

  return (
    <div className="menu-anchor" style={{ position: "relative" }} ref={wrap} onKeyDown={onKey}>
      <button ref={button} type="button" className={triggerClassName} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} aria-label={triggerLabel} title={triggerLabel} onClick={() => setOpen(!open)}>
        {trigger}
      </button>
      {open && <div className="menu" id={menuId} role="menu" aria-label={menuLabel} style={{ minWidth }}>{children(() => setOpen(false))}</div>}
    </div>
  );
}


import Link from "@/lib/link";
import { usePathname, useRouter } from "@/lib/router";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logoutAction } from "@/pages/auth/actions";
import { markAllNotifications, markNotification } from "@/pages/notification-actions";
import { Icon } from "@/components/Icon";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n/client";
import { Avatar } from "@/components/Avatar";
import { formatWeekdayDayMonthYear } from "@/lib/format";
import { useCurrentUser } from "@/lib/session";
import { PAGE_TITLES, type NavId } from "@/lib/nav";
import { ToastProvider } from "./Toasts";
import { currentTheme, setTheme, type Theme } from "./theme";

export interface ShellProps {
  currentUser: {
    code: string;
    name: string;
    designation: string;
    roleName: string;
    department: string;
    manager: string;
    dateOfJoining: string;
    shift: string | null;
    isAdminLike: boolean;
  };
  groups: { title: string; items: { id: string; label: string; icon: string }[] }[];
  /** `myTasks`: my open tasks (direct or accountable) that are overdue or due today; absent = 0. */
  badges: { approvals: number; proofs: number; myTasks?: number };
  notes: { text: string; meta: string; href?: string; id?: string | null; unread?: boolean; sticky?: boolean }[];
  unread: number;
  landing: string;
  canSelf: boolean;
  /** null for the super admin (the platform console) */
  businessName: string | null;
  initialTheme: Theme;
  children: React.ReactNode;
}

interface PaletteAction { group: string; label: string; icon: string; run: () => void; position: number }

export function Shell(props: ShellProps) {
  const { currentUser: signedInUser, groups, badges, notes, landing, canSelf, businessName } = props;
  const t = useT();
  const { user } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const firstSegment = pathname.split("/")[1] || "home";
  // a task page (/tasks/{key}) belongs to "My tasks"
  const page = (firstSegment === "tasks" ? "my-tasks" : firstSegment) as NavId;

  const [sideOpen, setSideOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notif, setNotif] = useState(false);
  const [profile, setProfile] = useState(false);
  // "My profile" is a page for everyone in a business (the super admin keeps the small card)
  const hasProfilePage = groups.some((g) => g.items.some((i) => i.id === "profile"));
  const openProfile = useCallback(() => (hasProfilePage ? router.push("/profile") : setProfile(true)), [hasProfilePage, router]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [theme, setThemeState] = useState<Theme>(props.initialTheme);
  const palIn = useRef<HTMLInputElement>(null);

  // Close transient UI on navigation (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setSideOpen(false);
    setMenu(false);
    setNotif(false);
  }

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = currentTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setThemeState(nextTheme);
  }, []);

  const goToPage = useCallback((id: string) => router.push(`/${id}`), [router]);
  const logout = useCallback(() => { void logoutAction(); }, []);

  const openPal = useCallback(() => {
    setPaletteOpen(true);
    setPaletteQuery("");
    setPaletteIndex(0);
    setMenu(false);
    setNotif(false);
    requestAnimationFrame(() => palIn.current?.focus());
  }, []);

  const acts = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    const out: PaletteAction[] = [];
    const add = (group: string, label: string, icon: string, run: () => void) => {
      if (!query || label.toLowerCase().includes(query) || group.toLowerCase().includes(query)) out.push({ group, label, icon, run, position: out.length });
    };
    if (canSelf) {
      add(t("Actions"), t("Check in / out"), "sunrise", () => goToPage("home"));
      add(t("Actions"), t("Apply for leave"), "plus", () => router.push("/leave?apply=1"));
    }
    add(t("Actions"), theme === "dark" ? t("Switch to light theme") : t("Switch to dark theme"), theme === "dark" ? "sun" : "moon", toggleTheme);
    groups.forEach((bucket) => bucket.items.forEach((n) => add(t("Go to"), t(n.label), n.icon, () => goToPage(n.id))));
    add(t("Account"), t("My profile"), "user", openProfile);
    add(t("Account"), t("Sign out"), "logout", logout);
    return out;
  }, [paletteQuery, canSelf, theme, groups, goToPage, router, toggleTheme, logout, openProfile, t]);

  const groupedActs = useMemo(() => {
    const groupedActions: { title: string; items: PaletteAction[] }[] = [];
    acts.forEach((action) => {
      let actionGroup = groupedActions.find((x) => x.title === action.group);
      if (!actionGroup) groupedActions.push((actionGroup = { title: action.group, items: [] }));
      actionGroup.items.push(action);
    });
    return groupedActions;
  }, [acts]);

  const runAct = (paletteAction: PaletteAction) => {
    setPaletteOpen(false);
    paletteAction.run();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (paletteOpen) setPaletteOpen(false);
        else openPal();
      } else if (e.key === "Escape") {
        setMenu(false);
        setNotif(false);
        setProfile(false);
        setSideOpen(false);
      }
    };
    const away = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.(".menu-anchor")) {
        setMenu(false);
        setNotif(false);
      }
    };
    const spot = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest?.(".card") as HTMLElement | null;
      if (!card) return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - bounds.left}px`);
      card.style.setProperty("--my", `${e.clientY - bounds.top}px`);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", away);
    document.addEventListener("pointermove", spot, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", away);
      document.removeEventListener("pointermove", spot);
    };
  }, [paletteOpen, openPal]);

  return (
    <ToastProvider>
      <div className="shell">
        <a className="skip" href="#main">{t("Skip to content")}</a>
        <div className={`scrim${sideOpen ? " open" : ""}`} onClick={() => setSideOpen(false)}></div>
        <aside id="side" className={`side${sideOpen ? " open" : ""}`} aria-label={t("Main menu")}>
          <Link className="ws" href={landing}>
            <span className="monogram">{(businessName ?? "J").charAt(0).toUpperCase()}</span>
            <span style={{ flex: 1, minWidth: 0 }}><b>{businessName ?? "JurisOne"}</b><small>{businessName ? t("JurisOne workspace") : t("Platform console")}</small></span>
            <Icon name="chevD" size={14} />
          </Link>
          <button className="side-search" type="button" onClick={openPal}><Icon name="search" size={15} />{t("Search")}<kbd>⌘K</kbd></button>
          {groups.map((navGroup) => (
            <div key={navGroup.title} style={{ display: "contents" }}>
              <div className="group">{t(navGroup.title)}</div>
              {navGroup.items.map((navItem) => (
                <Link key={navItem.id} href={`/${navItem.id}`} className={`nav-item${page === navItem.id ? " on" : ""}`} aria-current={page === navItem.id ? "page" : undefined}>
                  <span className="ic"><Icon name={navItem.icon} size={17} /></span>
                  {t(navItem.label)}
                  {navItem.id === "approvals" && badges.approvals > 0 && <span className="badge">{badges.approvals}</span>}
                  {navItem.id === "proofs" && badges.proofs > 0 && <span className="badge">{badges.proofs}</span>}
                  {navItem.id === "my-tasks" && (badges.myTasks ?? 0) > 0 && <span className="badge" title={t("Overdue or due today")}>{badges.myTasks}</span>}
                </Link>
              ))}
            </div>
          ))}
        </aside>

        <div className="main">
          <header className="top">
            <button className="icon-btn burger" onClick={() => setSideOpen(true)} aria-label={t("Open menu")} aria-controls="side" aria-expanded={sideOpen}><Icon name="menu" /></button>
            <div className="crumbs"><span>Juris</span><Icon name="chevR" size={14} /><b>{t(PAGE_TITLES[page] ?? "JurisOne")}</b></div>
            <div className="grow"></div>
            <button className="top-search" type="button" onClick={openPal}><Icon name="search" size={15} />{t("Search or jump to…")}<kbd>⌘K</kbd></button>
            <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? t("Switch to light theme") : t("Switch to dark theme")}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
            </button>
            <LanguageSwitcher />
            <div className="menu-anchor" style={{ position: "relative" }}>
              <button className="icon-btn" onClick={() => { setNotif(!notif); setMenu(false); }} aria-label={t("Notifications ({n} unread)", { n: props.unread })} aria-expanded={notif}>
                <Icon name="bell" size={17} />
                {(props.unread > 0 || badges.approvals + badges.proofs > 0) && <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 2px var(--surface)" }}></span>}
              </button>
              {notif && (
                <div className="menu notif">
                  <div className="head" style={{ justifyContent: "space-between" }}>
                    <b>{t("Notifications")}</b>
                    {props.unread > 0 ? <span className="chip gold nodot">{props.unread} {t("unread")}</span> : <span className="chip neutral nodot">{t("All read")}</span>}
                  </div>
                  {notes.length === 0 && <div className="n faint">{t("You're all caught up.")}</div>}
                  {notes.map((notification, i) => {
                    const unread = notification.id ? !!notification.unread : true;
                    const body = (<><i style={unread ? undefined : { background: "transparent", boxShadow: "inset 0 0 0 1px var(--line3)" }}></i><div><div style={{ fontWeight: unread ? 600 : 400 }}>{notification.text}</div><div className="faint" style={{ fontSize: 12, marginTop: 2 }}>{notification.meta}{notification.sticky ? ` · ${t("accept to clear")}` : ""}</div></div></>);
                    // opening a stored notification marks it read (policy ones clear only when the policy is accepted)
                    const onOpen = () => { if (notification.id && notification.unread && !notification.sticky) startTransition(() => { void markNotification(notification.id!, true).then(() => router.refresh()); }); setNotif(false); };
                    return notification.href ? <Link key={notification.id ?? i} href={notification.href} onClick={onOpen} className="n" style={{ color: "inherit", textDecoration: "none" }}>{body}</Link> : <div key={notification.id ?? i} className="n">{body}</div>;
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 10px 4px", borderTop: "1px solid var(--line)" }}>
                    <button type="button" className="btn btn-sm btn-ghost" disabled={props.unread === 0} onClick={() => startTransition(() => { void markAllNotifications().then(() => router.refresh()); })}>{t("Mark all read")}</button>
                    <Link className="btn btn-sm" href="/notifications" onClick={() => setNotif(false)}>{t("View all")}</Link>
                  </div>
                </div>
              )}
            </div>
            <div className="menu-anchor" style={{ position: "relative" }}>
              <button className="profile" onClick={() => { setMenu(!menu); setNotif(false); }} aria-haspopup="menu" aria-expanded={menu}>
                <Avatar id={user?.id} name={signedInUser.name} photo={user?.photo} plain />
                <span className="who"><b>{signedInUser.name}</b><small>{signedInUser.designation}</small></span>
                <Icon name="chevD" size={14} />
              </button>
              {menu && (
                <div className="menu" role="menu">
                  <div className="head">
                    <Avatar id={user?.id} name={signedInUser.name} photo={user?.photo} isLarge plain />
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><b>{signedInUser.name}</b><span className="faint" style={{ fontSize: 12.5 }}>{signedInUser.code} · {signedInUser.roleName}</span></div>
                  </div>
                  <button role="menuitem" onClick={() => { setMenu(false); openProfile(); }}><Icon name="user" size={16} />{t("My profile")}</button>
                  {canSelf && <button role="menuitem" onClick={() => { setMenu(false); goToPage("payslips"); }}><Icon name="doc" size={16} />{t("My payslips")}</button>}
                  <button role="menuitem" onClick={toggleTheme}><Icon name={theme === "dark" ? "sun" : "moon"} size={16} />{theme === "dark" ? t("Light theme") : t("Dark theme")}</button>
                  <button role="menuitem" onClick={() => { setMenu(false); openPal(); }}><Icon name="search" size={16} />{t("Command menu")}<kbd style={{ marginLeft: "auto" }}>⌘K</kbd></button>
                  <div className="sep"></div>
                  <button role="menuitem" className="danger" onClick={logout}><Icon name="logout" size={16} />{t("Sign out")}</button>
                </div>
              )}
            </div>
          </header>
          <main id="main" tabIndex={-1} className="content" key={pathname}>{props.children}</main>
        </div>

        {profile && (
          <div className="overlay" onClick={(e) => e.target === e.currentTarget && setProfile(false)}>
            <div className="modal sm" role="dialog" aria-modal="true" aria-labelledby="pf-t">
              <div className="modal-h">
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Avatar id={user?.id} name={signedInUser.name} photo={user?.photo} isLarge plain />
                  <div><span className="eyebrow">{signedInUser.code}</span><h2 id="pf-t" className="display">{signedInUser.name}</h2></div>
                </div>
                <button className="icon-btn" onClick={() => setProfile(false)} aria-label={t("Close")}><Icon name="x" size={16} /></button>
              </div>
              <div className="modal-b">
                <div className="kv"><span className="muted">{t("Designation")}</span><b>{signedInUser.designation}</b></div>
                <div className="kv"><span className="muted">{t("Role")}</span><b>{signedInUser.roleName}</b></div>
                <div className="kv"><span className="muted">{t("Department")}</span><b>{signedInUser.department}</b></div>
                <div className="kv"><span className="muted">{t("Reporting manager")}</span><b>{signedInUser.manager}</b></div>
                <div className="kv"><span className="muted">{t("Date of joining")}</span><b>{formatWeekdayDayMonthYear(signedInUser.dateOfJoining)}</b></div>
                {!signedInUser.isAdminLike && signedInUser.shift && <div className="kv"><span className="muted">{t("Shift")}</span><b>{signedInUser.shift}</b></div>}
              </div>
              <div className="modal-f">
                <span className="faint" style={{ fontSize: 12.5 }}>{t("To change details, contact HR.")}</span>
                <button className="btn btn-danger" onClick={() => { setProfile(false); logout(); }}><Icon name="logout" size={16} />{t("Sign out")}</button>
              </div>
            </div>
          </div>
        )}

        {paletteOpen && (
          <div className="pal-wrap" onClick={(e) => e.target === e.currentTarget && setPaletteOpen(false)}>
            <div className="pal" role="dialog" aria-modal="true" aria-label={t("Command menu")}>
              <div className="pal-in">
                <Icon name="search" size={18} />
                <input
                  ref={palIn}
                  value={paletteQuery}
                  onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0); }}
                  onKeyDown={(e) => {
                    const actionCount = acts.length;
                    if (e.key === "ArrowDown") { e.preventDefault(); if (actionCount) setPaletteIndex((paletteIndex + 1) % actionCount); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); if (actionCount) setPaletteIndex((paletteIndex - 1 + actionCount) % actionCount); }
                    else if (e.key === "Enter") { e.preventDefault(); if (acts[paletteIndex]) runAct(acts[paletteIndex]); }
                    else if (e.key === "Escape") setPaletteOpen(false);
                  }}
                  placeholder={t("Type a command or search…")}
                  aria-label={t("Command")}
                />
                <kbd>esc</kbd>
              </div>
              <div className="pal-list" role="listbox">
                {groupedActs.map((paletteGroup) => (
                  <div key={paletteGroup.title}>
                    <div className="pal-g">{paletteGroup.title}</div>
                    {paletteGroup.items.map((paletteItem) => (
                      <button key={paletteItem.label} type="button" role="option" aria-selected={paletteItem.position === paletteIndex} className={`pal-item${paletteItem.position === paletteIndex ? " act" : ""}`} onMouseEnter={() => setPaletteIndex(paletteItem.position)} onClick={() => runAct(paletteItem)}>
                        <span className="ic"><Icon name={paletteItem.icon} size={15} /></span>{paletteItem.label}
                      </button>
                    ))}
                  </div>
                ))}
                {!acts.length && <div className="pal-g" style={{ padding: 24, textAlign: "center" }}>{t("No results for")} “{paletteQuery}”</div>}
              </div>
              <div className="pal-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> {t("navigate")}</span><span><kbd>↵</kbd> {t("select")}</span><span style={{ marginLeft: "auto" }}>JurisOne</span></div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}

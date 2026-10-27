import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n/client";
import { logoutAction } from "@/pages/auth/actions";
import { ToastProvider } from "./Toasts";

/**
 * The shell of an employee whose onboarding is not approved yet: no sidebar, no workspace switcher, no search, no notifications,
 * no breadcrumbs. Only the product name, the employee's name, the language switcher and Sign out.
 */
export function LockedShell({ employeeName, children }: { employeeName: string; children: ReactNode }) {
  const t = useT();
  return (
    <ToastProvider>
      <div className="shell">
        <div className="main">
          <header className="top locked-top">
            <span className="locked-brand"><span className="monogram">J</span><b>JurisOne</b></span>
            <div className="grow"></div>
            <span className="locked-name">{employeeName}</span>
            <LanguageSwitcher />
            <button type="button" className="btn btn-sm" onClick={() => void logoutAction()}><Icon name="logout" size={15} />{t("Sign out")}</button>
          </header>
          <main id="main" tabIndex={-1} className="content">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

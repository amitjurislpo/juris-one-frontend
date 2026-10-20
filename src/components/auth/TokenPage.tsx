import { useQuery } from "@tanstack/react-query";
import Link from "@/lib/link";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { apiCall } from "@/lib/api";
import { useT } from "@/lib/i18n/client";
import { PASSWORD_RULES } from "@/lib/password-rules";

/** Shared by /invite/:token and /reset/:token. */
export function TokenPage({ token, purpose }: { token: string; purpose: "INVITE" | "RESET" }) {
  const t = useT();
  const q = useQuery({
    queryKey: ["api", "token", purpose, token],
    queryFn: async () => {
      const r = await apiCall<{ name: string; code: string }>("GET", `/api/auth/tokens/${purpose}/${encodeURIComponent(token)}`);
      return r.body.ok ? r.body.data! : null;
    },
    staleTime: Infinity,
  });
  if (q.isPending) return <AuthFrame><div className="login-card" aria-busy="true" /></AuthFrame>;
  const info = q.data;
  return (
    <AuthFrame>
      {info ? (
        <SetPasswordForm token={token} purpose={purpose} name={info.name} code={info.code} rules={PASSWORD_RULES} />
      ) : (
        <div className="login-card">
          <h2 className="display">{t("Link expired")}</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
            {t("This link has expired or was already used.")} {purpose === "INVITE" ? t("Ask HR to resend your invite, or request a new link from the sign-in page.") : t("Request a new link from the sign-in page.")}
          </p>
          <Link href="/forgot" className="btn btn-gold btn-lg" style={{ width: "100%" }}>{t("Get a new link")}</Link>
          <Link href="/login" className="btn btn-ghost" style={{ alignSelf: "flex-start" }}>{t("Back to sign in")}</Link>
        </div>
      )}
    </AuthFrame>
  );
}

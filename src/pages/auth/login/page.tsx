import { Navigate } from "react-router";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginForm } from "@/components/auth/LoginForm";
import { useT } from "@/lib/i18n/client";
import { useSearchRecord } from "@/lib/router";
import { landingPath, useCurrentUser } from "@/lib/session";

/** The fixed sign-in code of a development/e2e API (VITE_DEV_OTP_CODE at build time). Left unset in every real environment. */
const DEV_CODE = (import.meta.env.VITE_DEV_OTP_CODE as string | undefined) || undefined;

export default function LoginPage() {
  const { user } = useCurrentUser();
  const t = useT();
  const q = useSearchRecord();
  if (user) return <Navigate to={landingPath(user)} replace />;
  const notice = q.signedout
    ? t("Signed out securely.")
    : undefined;
  return (
    <AuthFrame>
      <LoginForm notice={notice} next={q.next} devCode={DEV_CODE} />
    </AuthFrame>
  );
}

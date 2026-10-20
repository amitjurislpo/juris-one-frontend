import { useParams } from "react-router";
import { TokenPage } from "@/components/auth/TokenPage";

export default function InvitePage() {
  const { token } = useParams();
  return <TokenPage token={token!} purpose="INVITE" />;
}

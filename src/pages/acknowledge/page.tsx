import { Navigate } from "react-router";
import type { PolicyToRead } from "@/lib/api-types";
import { landingPath } from "@/lib/session";
import { PageLoading, useData, usePage } from "@/lib/page";
import { AcknowledgeClient } from "./AcknowledgeClient";


/** Shown instead of every page until the user has accepted the current version of each published policy that needs it. */
export default function AcknowledgePage() {
  const { user } = usePage();
  const pending = useData<PolicyToRead[]>(user.subscriptionActive === false || user.readOnly ? null : "/api/policies/pending");
  if (user.subscriptionActive === false) return <Navigate to="/paused" replace />;
  if (user.readOnly) return <Navigate to={landingPath(user)} replace />; // accepting a policy is a change: not while the subscription has ended
  if (!pending) return <PageLoading />;
  if (!pending.length) return <Navigate to={landingPath(user)} replace />;
  return <AcknowledgeClient policy={pending[0]} left={pending.length} name={user.name} />;
}

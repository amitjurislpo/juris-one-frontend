import type { LeavePolicy } from "@/lib/api-types";
import { PageLoading, useData } from "@/lib/page";
import { LeavePolicyClient } from "./LeavePolicyClient";

/** Admin and HR: the leave year and what happens to each leave type's balance when it ends. */
export default function LeavePolicyPage() {
  const policy = useData<LeavePolicy>("/api/v1/settings/leave-policy");
  if (!policy) return <PageLoading />;
  return <LeavePolicyClient policy={policy} />;
}

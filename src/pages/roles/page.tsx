import { PageLoading, useData, usePage } from "@/lib/page";
import { RolesClient, type RoleView } from "./RolesClient";


export default function RolesPage() {
  const { sp } = usePage();
  const view = useData<RoleView[]>("/api/roles");
  if (!view) return <PageLoading />;
  const sel = typeof sp.role === "string" && view.some((r) => r.id === sp.role) ? sp.role : (view.find((r) => r.key === "hrm") ?? view[0]).id;
  return <RolesClient roles={view} initialSel={sel} />;
}

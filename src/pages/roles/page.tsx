import { PageLoading, useData, usePage } from "@/lib/page";
import { RolesClient, type RoleView } from "./RolesClient";


export default function RolesPage() {
  const { searchParams } = usePage();
  const view = useData<RoleView[]>("/api/v1/roles");
  if (!view) return <PageLoading />;
  const sel = typeof searchParams.role === "string" && view.some((listedRole) => listedRole.id === searchParams.role) ? searchParams.role : (view.find((listedRole) => listedRole.key === "hrm") ?? view[0]).id;
  return <RolesClient roles={view} initialSel={sel} />;
}

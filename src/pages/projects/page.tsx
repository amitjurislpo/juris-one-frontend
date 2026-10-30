import { toQueryString } from "@/lib/api";
import type { ProjectRow, TaskPage } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { ProjectsClient } from "./ProjectsClient";

/** Projects I can see (the Owner: all of them); filtered, sorted and paged by the API. */
export default function ProjectsPage() {
  const { user, searchParams } = usePage();
  const data = useData<TaskPage<ProjectRow>>(`/api/v1/projects${toQueryString({ sort: "name", ...searchParams })}`);
  // departments are offered in "New project" only to those who manage them (the list is theirs to read)
  const canCreate = user.perms.has("projects.create") || user.perms.has("tasks.manage");
  const departments = useData<{ rows: { id: string; name: string }[] }>(canCreate && user.perms.has("dept.manage") ? "/api/v1/departments" : null);
  if (!data) return <PageLoading />;
  return <ProjectsClient data={data} departments={departments?.rows ?? []} />;
}

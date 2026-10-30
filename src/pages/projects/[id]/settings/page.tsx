import type { ProjectDetail, ProjectMember } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { ProjectSettingsClient } from "./ProjectSettingsClient";

/** Project settings (owners edit; members and viewers see them read-only). */
export default function ProjectSettingsPage() {
  const { params } = usePage();
  const projectId = encodeURIComponent(params.id);
  const project = useData<ProjectDetail>(`/api/v1/projects/${projectId}`);
  const members = useData<ProjectMember[]>(`/api/v1/projects/${projectId}/members`);
  if (!project || !members) return <PageLoading />;
  return <ProjectSettingsClient project={project} members={members} />;
}

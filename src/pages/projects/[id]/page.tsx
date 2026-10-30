import { useTaskView } from "@/components/tasks/useTaskView";
import type { ProjectBoard, ProjectDetail, ProjectMember, TaskPage, TaskRow } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { taskListPath } from "@/lib/tasks";
import { ProjectClient } from "./ProjectClient";

/** Filters the board endpoint takes (backend plan §12.1 P15). */
const BOARD_FILTERS = ["assigneeId", "indirectAssigneeId", "labelId", "priority", "type", "search"];

/** One project: List (sortable, paged table) or Board (a column per step). */
export default function ProjectPage() {
  const { searchParams, params } = usePage();
  const projectId = encodeURIComponent(params.id);
  const { view, setView } = useTaskView("jurisone.project.view", "board");
  const project = useData<ProjectDetail>(`/api/v1/projects/${projectId}`);
  const members = useData<ProjectMember[]>(`/api/v1/projects/${projectId}/members`);
  const boardFilters = Object.fromEntries(Object.entries(searchParams).filter(([name]) => BOARD_FILTERS.includes(name)));
  const board = useData<ProjectBoard>(view === "board" ? taskListPath(`/api/v1/projects/${projectId}/board`, boardFilters) : null);
  const list = useData<TaskPage<TaskRow>>(view === "list" ? taskListPath("/api/v1/tasks", searchParams, { sort: "dueDate", pageSize: "50" }, { projectId: params.id }) : null);
  if (!project || !members) return <PageLoading />;
  return <ProjectClient project={project} members={members} board={board} list={list} view={view} onViewChange={setView} />;
}

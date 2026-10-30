import type { TeamTasksPage } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { taskListPath } from "@/lib/tasks";
import { TeamTasksClient } from "./TeamTasksClient";

/** Tasks of my reports (depth 1, or 2 with "Include indirect reports"): who has what, and what is late. */
export default function TeamTasksPage() {
  const { searchParams } = usePage();
  const data = useData<TeamTasksPage>(taskListPath("/api/v1/tasks/team", searchParams, { sort: "dueDate" }));
  if (!data) return <PageLoading />;
  return <TeamTasksClient data={data} />;
}

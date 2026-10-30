import type { TaskSettings } from "@/lib/api-types";
import { PageLoading, useData } from "@/lib/page";
import { TaskSettingsClient } from "./TaskSettingsClient";

/** Owner only (`tasks.manage`): default workflow and company labels. */
export default function TaskSettingsPage() {
  const settings = useData<TaskSettings>("/api/v1/task-settings");
  if (!settings) return <PageLoading />;
  return <TaskSettingsClient settings={settings} />;
}

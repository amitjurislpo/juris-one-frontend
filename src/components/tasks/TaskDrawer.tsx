import { Suspense } from "react";
import { Drawer } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { PageErrorBoundary, PageLoading } from "@/lib/page";
import { refreshData } from "@/lib/query";
import { TaskDetail } from "./TaskDetail";
import { useTaskDrawer } from "./useTaskDrawer";

/** The task side panel of a list page: open while the URL has `?task=WEB-12`; closing removes the parameter. */
export function TaskDrawer() {
  const t = useT();
  const { taskRef, closeTask } = useTaskDrawer();
  if (!taskRef) return null;
  return (
    <Drawer label={t("Task {key}", { key: taskRef })} onClose={closeTask} width={560}>
      <PageErrorBoundary key={taskRef} onRetry={refreshData}>
        <Suspense fallback={<PageLoading />}>
          <TaskDetail taskRef={taskRef} onClose={closeTask} />
        </Suspense>
      </PageErrorBoundary>
    </Drawer>
  );
}

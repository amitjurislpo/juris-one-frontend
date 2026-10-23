import type { ActionResult } from "@/lib/action";
import type { TaskRow, TaskStatusCategory } from "@/lib/api-types";
import { updateTask } from "@/pages/tasks/actions";

/**
 * Sets a task to the first step of a category (the My tasks checkbox and board, sub-task ticks): the server maps
 * `statusCategory` to the task's project step. The row's `version` guards against overwriting someone else's change.
 */
export function changeTaskCategory(task: Pick<TaskRow, "id" | "version">, statusCategory: TaskStatusCategory): Promise<ActionResult<{ version: number }>> {
  return updateTask(task.id, { version: task.version, statusCategory });
}

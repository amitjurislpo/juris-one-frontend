import { PageHeader } from "@/components/PageHeader";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { usePage } from "@/lib/page";

/** One task in full (links from notifications and lists): `ref` is its key (WEB-12) or id. A task you cannot see is "Not found". */
export default function TaskPage() {
  const { t, params } = usePage();
  return (
    <div className="col">
      <PageHeader eyebrow={t("Tasks")} title={t("Task")} />
      <section className="card pad enter task-page" style={{ ["--i" as string]: 1 }}>
        <TaskDetail taskRef={params.ref} />
      </section>
    </div>
  );
}

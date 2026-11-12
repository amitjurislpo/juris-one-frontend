import { useData } from "@/lib/page";

/** Pending requests waiting for the signed-in user to decide, counted by the server's approval rule (GET /api/v1/attendance/pending-counts). */
export interface PendingCounts { regularization: number; onDuty: number; remoteWork: number; total: number; managesHr: boolean }

/** The counts, refetched after every successful request or decision; null while loading. */
export const usePendingCounts = () => useData<PendingCounts>("/api/v1/attendance/pending-counts");

/** A tab label with its pending count: "On Duty · 3", or just the label when nothing waits. */
export const withPendingCount = (label: string, count: number | undefined) => (count ? `${label} · ${count}` : label);

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiCall } from "@/lib/api";
import { useTrackContext, GATEWAY_PATH } from "@/pages/juris-track/useTrackContext";
import { TrackProvider, type TrackUser } from "@/track";
import { TodayCard } from "@/track/pages/dashboard/TodayCard";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { useTimeEvent } from "@/track/time/useTimeEvent";
import { useTimeState } from "@/track/time/useTimeState";

/** JurisTrack's user when its service answers (gateway on, service up), else null. Never throws: Home then shows the normal check-in card. */
async function loadTrackUser(): Promise<TrackUser | null> {
  try {
    const service = await apiCall<{ status: string }>("GET", GATEWAY_PATH, undefined, { quiet: true });
    if (!service.body.ok || service.body.data?.status !== "ACTIVE") return null;
    const trackUser = await apiCall<TrackUser>("GET", `${GATEWAY_PATH}/me`, undefined, { quiet: true });
    return trackUser.body.ok ? (trackUser.body.data ?? null) : null;
  } catch {
    return null;
  }
}

/** The placeholder card shown while it is not yet known which clock Home gets (so the punch card never flashes). */
function TimerPlaceholder() {
  return <section className="card timecard span-7 enter" style={{ ["--i" as string]: 1 }} role="status" aria-busy="true"><span className="muted">…</span></section>;
}

/** JurisTrack's "Today" card; when its time state cannot be read the fallback (the normal check-in card) takes its place. */
function TrackTimer({ fallback }: { fallback: ReactNode }) {
  const timeState = useTimeState({ isLive: true });
  const runner = useTimeEvent();
  const { timeZone } = useDisplayTimeZone();
  const reading = timeState.data;
  if (!reading) return timeState.isError ? fallback : <TimerPlaceholder />;
  return <TodayCard reading={reading} runner={runner} timeZone={timeZone} />;
}

/** Wraps the timer in JurisTrack's context once its user is known. */
function TrackTimerWithContext({ trackUser, fallback }: { trackUser: TrackUser; fallback: ReactNode }) {
  const contextValue = useTrackContext(trackUser);
  return <TrackProvider value={contextValue}><TrackTimer fallback={fallback} /></TrackProvider>;
}

/**
 * The one clock of a business with JurisTrack: JurisTrack's time card (start work, break, resume, end day). `fallback` (the normal
 * check-in card) is shown when JurisTrack does not answer, so nobody loses the ability to record their time.
 */
export function HomeTrackTimer({ fallback }: { fallback: ReactNode }) {
  const query = useQuery({ queryKey: ["api", "home-track-user"], queryFn: loadTrackUser });
  if (query.isPending) return <TimerPlaceholder />;
  if (!query.data) return fallback;
  return <TrackTimerWithContext trackUser={query.data} fallback={fallback} />;
}

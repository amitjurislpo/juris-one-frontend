import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

/** "Working for hh:mm" since the server's check-in time, counted in the browser (the minute is redrawn every 10 seconds). */
export function WorkingFor({ since }: { since: string }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(intervalId);
  }, []);
  return <span className="muted num" style={{ fontSize: 13 }} role="timer" aria-label={t("Working for {time}", { time: formatElapsed(since, now) })}>{t("Working for {time}", { time: formatElapsed(since, now) })}</span>;
}

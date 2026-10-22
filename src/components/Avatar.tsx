import { useState } from "react";
import { avatarColorClass, initials } from "@/lib/format";

/**
 * The round person marker: the employee's photo when they have one (`photo` is the epoch millis of its last change, so a
 * new upload is not served from the cache), else — or when the picture fails to load — their initials.
 * `lg` is the 52px size; `plain` keeps the default purple initials circle instead of a per-person colour (the top bar); `style` can resize it further (small chips).
 */
export function Avatar({ id, name, photo, isLarge, plain, style }: { id?: string; name: string; photo?: number | null; isLarge?: boolean; plain?: boolean; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState<number | null>(null);
  const showPhoto = !!id && !!photo && failed !== photo;
  return (
    <span className={`avatar${isLarge ? " lg" : ""}${plain ? "" : ` ${avatarColorClass(initials(name))}`}`} style={style} title={name}>
      {showPhoto ? <img src={`/api/people/${id}/photo?v=${photo}`} alt={name} loading="lazy" onError={() => setFailed(photo)} /> : initials(name)}
    </span>
  );
}

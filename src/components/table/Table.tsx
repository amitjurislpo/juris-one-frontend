
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import { useQuery } from "./useQuery";

/** Prototype `.tsearch` — debounced, writes ?search= */
export function SearchBox({ placeholder, label, isLarge: big }: { placeholder: string; label: string; isLarge?: boolean }) {
  const { get, set } = useQuery();
  const urlQ = get("search");
  const [searchText, setSearchText] = useState(urlQ);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // keep the box in sync when the URL changes elsewhere (e.g. "Clear filters")
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (lastUrlQ !== urlQ) {
    setLastUrlQ(urlQ);
    setSearchText(urlQ);
  }
  useEffect(() => () => clearTimeout(debounceTimer.current), []);
  return (
    <label className={`tsearch${big ? " big" : ""}`}>
      <Icon name="search" size={big ? 16 : 15} />
      <input
        value={searchText}
        onChange={(e) => {
          const val = e.target.value;
          setSearchText(val);
          clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => set({ search: val.trim() || null }), 250);
        }}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
      />
    </label>
  );
}

/** Prototype `.tsel` dropdown filter bound to ?<name>= */
export function SelectFilter({ name, label, options, dflt }: { name: string; label: string; options: { value: string; label: string }[]; dflt: string }) {
  const { get, set } = useQuery();
  return (
    <label className="tsel">
      <span>{label}</span>
      <select value={get(name, dflt)} onChange={(e) => set({ [name]: e.target.value === dflt ? null : e.target.value })}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Prototype `.seg` segmented filter bound to ?<name>= */
export function SegmentedFilter({ name, options, dflt, label }: { name: string; options: { value: string; label: string }[]; dflt: string; label: string }) {
  const { get, set } = useQuery();
  const cur = get(name, dflt);
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={cur === option.value ? "on" : undefined} aria-pressed={cur === option.value} onClick={() => set({ [name]: option.value === dflt ? null : option.value })}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Click-to-sort column header (↑ / ↓ / ↕). */
export function SortableHeader({ sortKey, children, right, dflt, dfltDir = "asc", className }: { sortKey: string; children: React.ReactNode; right?: boolean; dflt: string; dfltDir?: "asc" | "desc"; className?: string }) {
  const { get, set } = useQuery();
  const sort = get("sort", dflt);
  const direction = get("sortDirection", dfltDir);
  const isSorted = sort === sortKey;
  const next = isSorted ? (direction === "asc" ? "desc" : "asc") : "asc";
  return (
    <th className={[right && "r", className].filter(Boolean).join(" ") || undefined} aria-sort={isSorted ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button className="sh" type="button" onClick={() => set({ sort: sortKey, sortDirection: next })}>
        {children}
        <i>{isSorted ? (direction === "asc" ? "↑" : "↓") : "↕"}</i>
      </button>
    </th>
  );
}

export function Pager({ page, take, total }: { page: number; take: number; total: number }) {
  const t = useT();
  const { set } = useQuery();
  if (total <= take) return null;
  const last = Math.ceil(total / take);
  const from = (page - 1) * take + 1;
  return (
    <div className="pager">
      <span className="mono">{t("{from}–{to} of {total}", { from, to: Math.min(total, page * take), total })}</span>
      <span style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-sm" type="button" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}><Icon name="chevL" size={14} />{t("Previous")}</button>
        <button className="btn btn-sm" type="button" disabled={page >= last} onClick={() => set({ page: String(page + 1) })}>{t("Next")}<Icon name="chevR" size={14} /></button>
      </span>
    </div>
  );
}

/** Wraps a table body so it dims while the server re-renders after a filter change. */
export function Pending({ children }: { children: React.ReactNode }) {
  const { pending } = useQuery();
  return <div style={{ opacity: pending ? 0.55 : 1, transition: "opacity .15s" }} aria-busy={pending}>{children}</div>;
}

export function ClearFilters({ label }: { label?: string }) {
  const t = useT();
  const { params, set } = useQuery();
  return (
    <button className="btn btn-sm" type="button" onClick={() => set(Object.fromEntries([...params.keys()].map((paramKey) => [paramKey, null])))}>
      {label ?? t("Clear filters")}
    </button>
  );
}

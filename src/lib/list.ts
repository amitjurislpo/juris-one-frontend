/** URL search params on list pages (the API applies ?search=&sort=&sortDirection=&page= and the filters). */
export type SearchParams = Record<string, string | string[] | undefined>;

const str = (searchParams: SearchParams, parameterName: string, dflt = "") => {
  const rawValue = searchParams[parameterName];
  return (Array.isArray(rawValue) ? rawValue[0] : rawValue)?.slice(0, 200) ?? dflt;
};

/** Read a value restricted to an allowed set. */
export function pick<T extends string>(searchParams: SearchParams, parameterName: string, allowed: readonly T[], dflt: T): T {
  const selected = str(searchParams, parameterName);
  return (allowed as readonly string[]).includes(selected) ? (selected as T) : dflt;
}

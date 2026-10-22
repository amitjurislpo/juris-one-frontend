/** What every server action returns — the API's `{ ok, message?, data?, error? }` envelope, passed through unchanged. */
export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; error: string };

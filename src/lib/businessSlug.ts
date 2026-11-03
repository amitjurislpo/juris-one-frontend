/** The longest short name the API accepts. */
export const MAX_SLUG_LENGTH = 40;

/** How long typing must pause before the availability check is asked. */
export const SLUG_CHECK_DELAY_MS = 400;

/** A short name proposed from a business name: "Acme & Sons (P) Ltd." becomes "acme-sons-p-ltd". May be empty when nothing usable is left. */
export function suggestSlugFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "");
}

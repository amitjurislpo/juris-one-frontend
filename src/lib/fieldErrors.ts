/** Field errors keyed by JSON path ("education[1].institute"), as the forms and the API's 422 answer both use. */
export type FieldErrorMap = Record<string, string>;

/** A server error together with the value its field had when the server refused it. */
export type ServerErrorSnapshot = Record<string, { message: string; value: unknown }>;

/** The value at a path like "education[1].institute" or "nominations.eps.familyMemberId" inside a request body, or undefined when it is not there. */
export function valueAtPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const part of path.split(/[.[\]]/).filter((segment) => segment !== "")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Remembers each server error with the value its field holds now, so the error can go as soon as the field is edited. */
export function snapshotServerErrors(errors: FieldErrorMap, body: unknown): ServerErrorSnapshot {
  return Object.fromEntries(Object.entries(errors).map(([path, message]) => [path, { message, value: valueAtPath(body, path) }]));
}

/**
 * What a form shows after an edit: the fresh client-side findings, plus every server error whose field still holds the value
 * the server refused. A server error therefore stays until its own field changes and never disappears because another field was edited.
 */
export function mergeFieldErrors(clientErrors: FieldErrorMap, serverErrors: ServerErrorSnapshot, body: unknown): FieldErrorMap {
  const merged: FieldErrorMap = {};
  for (const [path, { message, value }] of Object.entries(serverErrors)) {
    if (JSON.stringify(valueAtPath(body, path)) === JSON.stringify(value)) merged[path] = message;
  }
  return { ...merged, ...clientErrors };
}

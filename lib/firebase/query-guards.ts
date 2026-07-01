// ============================================================
// KalaSetu — Firestore query parameter guards
// Prevents where() from receiving undefined/null/empty values.
// ============================================================
import type { PaginatedResult } from '@/app/types';

/** True for non-empty trimmed strings (valid document/field IDs). */
export function isValidQueryString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Filter an array down to valid Firestore document IDs. */
export function filterValidIds(ids: (string | null | undefined)[]): string[] {
  return ids.filter(isValidQueryString);
}

/** Empty paginated result for early-return when query params are invalid. */
export function emptyPaginatedResult<T>(): PaginatedResult<T> {
  return { data: [], lastDoc: null, hasMore: false };
}

/** Returns the value if valid, otherwise null (caller should skip the query). */
export function requireQueryString(
  value: unknown,
  _fieldName?: string
): string | null {
  return isValidQueryString(value) ? value : null;
}

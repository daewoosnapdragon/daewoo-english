/**
 * Sanitization utilities for Supabase PostgREST query filters.
 *
 * PostgREST `.or()` and `.ilike()` filters interpolate values directly
 * into filter strings. Special characters must be escaped to prevent
 * query manipulation.
 */

/**
 * Escape special characters for use in PostgREST ILIKE patterns.
 *
 * Characters escaped:
 *  - `%` and `_` — LIKE wildcards
 *  - `.` — PostgREST column separator
 *  - `(` and `)` — PostgREST grouping operators
 *  - `,` — PostgREST OR separator inside `.or()`
 *  - `\` — escape character itself
 */
export function sanitizeIlike(input: string): string {
  if (!input) return '';
  return input
    .replace(/\\/g, '\\\\')   // escape backslash first
    .replace(/%/g, '\\%')     // LIKE wildcard
    .replace(/_/g, '\\_')     // LIKE single-char wildcard
    .replace(/\./g, '\\.')    // PostgREST column separator
    .replace(/\(/g, '\\(')    // PostgREST grouping
    .replace(/\)/g, '\\)')    // PostgREST grouping
    .replace(/,/g, '\\,');    // PostgREST OR separator
}

/**
 * Truncate and sanitize a general search string.
 * Limits length to prevent abuse and strips control characters.
 */
export function sanitizeSearchInput(input: string, maxLength = 200): string {
  if (!input) return '';
  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x1f\x7f]/g, '') // strip control chars
    .trim();
}

/**
 * Build a safe `.or()` filter for searching across multiple columns with ILIKE.
 */
export function buildSearchFilter(term: string, columns: string[]): string {
  const safe = sanitizeIlike(sanitizeSearchInput(term));
  if (!safe) return '';
  return columns.map(col => `${col}.ilike.%${safe}%`).join(',');
}

/**
 * Build a compound OR filter for multiple search terms across multiple columns.
 * Deduplicates terms and limits count.
 */
export function buildMultiTermFilter(
  terms: string[],
  columns: string[],
  maxTerms = 10
): string {
  const unique = Array.from(new Set(
    terms.map(t => sanitizeSearchInput(t)).filter(Boolean)
  )).slice(0, maxTerms);
  return unique.map(term => buildSearchFilter(term, columns)).filter(Boolean).join(',');
}

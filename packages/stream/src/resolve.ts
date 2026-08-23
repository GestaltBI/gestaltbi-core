import type { ColumnDirectory } from './column-directory.js';
import { COHORT, DIMENSION, GEO, TIME } from './tags.js';

/**
 * Every tag that marks a column as a dimension.
 *
 * `uatu:dimension:time`, `:geo` and `:cohort` are *refinements* of
 * `uatu:dimension`, so a structure carrying only the refinement still has a
 * dimension. Reading the base tag alone makes a dataset whose only axis is time
 * look like it has no axes at all.
 */
export const DIMENSION_TAGS = [DIMENSION, TIME, GEO, COHORT];

/**
 * Tags that mark the time dimension, newest vocabulary last.
 *
 * Two vocabularies are in circulation. Config repos authored for
 * `gestaltbi-core` (see `GestaltBI/sample-config`) rename the date column to
 * the canonical code `uatu:date` via `mapping.json` and tag it
 * `uatu:timedimension`. `@gestaltbi/infer` emits the newer
 * `uatu:dimension` / `uatu:dimension:time` pair instead. Both are accepted
 * everywhere so an op works against either.
 */
export const TIME_TAGS = ['uatu:date', 'uatu:timedimension', 'uatu:dimension:time'];

const cols = (dir: ColumnDirectory | undefined, tag: string): string[] => {
  try {
    return dir?.getColumnsFor(tag) ?? [];
  } catch {
    return [];
  }
};

/**
 * Find the column carrying time, in order of confidence:
 *   1. an explicit column name from the op's options
 *   2. any of {@link TIME_TAGS} in the column directory
 *   3. a column literally named `uatu:date` — the canonical code that
 *      `mapping.json` produces, present even when no structure is loaded
 *   4. the first column whose first value is a Date
 *
 * Returns `undefined` when nothing matches, so callers can decide whether that
 * is fatal or merely means "leave the order alone".
 */
export function resolveTimeColumn(
  dir: ColumnDirectory | undefined,
  rows?: any[],
  explicit?: string,
): string | undefined {
  if (explicit) return explicit;
  for (const tag of TIME_TAGS) {
    const found = cols(dir, tag);
    if (found.length) return found[0];
  }
  const first = rows?.[0];
  if (first && Object.prototype.hasOwnProperty.call(first, 'uatu:date')) return 'uatu:date';
  if (first) {
    const guess = Object.keys(first).find((k) => first[k] instanceof Date);
    if (guess) return guess;
  }
  return undefined;
}

/** Ascending comparator over a date-ish column. Unparseable values compare equal. */
export const byDate =
  (rows: any[], col: string | undefined) =>
  (a: number, b: number): number => {
    if (!col) return 0;
    const av = rows[a][col], bv = rows[b][col];
    const ad = +new Date(av), bd = +new Date(bv);
    if (Number.isFinite(ad) && Number.isFinite(bd)) return ad - bd;
    return String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
  };

/** Every column acting as a dimension, in {@link DIMENSION_TAGS} order, deduplicated. */
export function dimensionColumns(dir: ColumnDirectory | undefined): string[] {
  const seen = new Set<string>();
  for (const tag of DIMENSION_TAGS) {
    for (const column of cols(dir, tag)) seen.add(column);
  }
  return [...seen];
}

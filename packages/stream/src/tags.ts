/**
 * Tag vocabulary.
 *
 * Tags are the contract between `structure.json` and the ops: an op never
 * hard-codes a column name, it asks the ColumnDirectory for the columns
 * carrying a tag. Everything here is a plain string so a structure document
 * authored by hand (or by `@gestaltbi/infer`) stays readable.
 */

/** Column roles. */
export const DIMENSION = 'uatu:dimension';
export const MEASURE = 'uatu:measure';

/** Dimension refinements. */
export const TIME = 'uatu:dimension:time';
export const GEO = 'uatu:dimension:geo';
export const COHORT = 'uatu:dimension:cohort';

/** Drives which columns `aggregate` rolls up, and how. */
export const AGGREGABLE = 'uatu:aggregable';

/**
 * Stock vs flow.
 *
 * A **flow** is produced by a period (new users in March, March revenue) and
 * is meaningful to sum across periods. A **stock** is a level measured at a
 * point (storage under management, headcount, cumulative users); summing it
 * across periods is meaningless and averaging it is usually wrong too.
 *
 * Untagged numeric columns stay plain `uatu:measure` and keep today's
 * behaviour — this is additive.
 */
export const FLOW = 'uatu:measure:flow';
export const STOCK = 'uatu:measure:stock';

/**
 * A ratio carries its own numerator and denominator so it can be re-aggregated
 * correctly. Averaging a rate across groups is not the rate of the union;
 * `aggregate`'s `ratio` type sums numerator and denominator and divides once.
 */
export const RATIO = 'uatu:measure:ratio';

/**
 * Accounting basis. Two columns tagged with different bases and the same
 * `measureOf(...)` key are two views of one quantity — the interface should
 * never show one without the other being available, and `divergence` checks
 * that they have not drifted.
 */
export const BASIS_CASH = 'uatu:measure:basis:cash';
export const BASIS_ACCRUAL = 'uatu:measure:basis:accrual';

/** Links measures that describe the same underlying quantity. */
export const measureOf = (code: string): string => `uatu:measure:of:${code}`;

/** Unit of a measure — stops `covers` comparing terabytes against dollars. */
export const unit = (u: string): string => `uatu:measure:unit:${u}`;

/** Parse the `uatu:measure:of:<code>` / `uatu:measure:unit:<u>` families back out of a tag list. */
export const parseSuffix = (tags: string[], prefix: string): string | undefined => {
  const t = (tags || []).find((x) => x.startsWith(prefix));
  return t ? t.slice(prefix.length) : undefined;
};

export const measureOfKey = (tags: string[]): string | undefined => parseSuffix(tags, 'uatu:measure:of:');
export const unitOf = (tags: string[]): string | undefined => parseSuffix(tags, 'uatu:measure:unit:');

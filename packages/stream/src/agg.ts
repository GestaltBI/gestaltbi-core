/**
 * Aggregation kinds, shared by every op that rolls values up.
 *
 * `aggregate` and `pivot` accumulate the same way on purpose: a sum in a pivot
 * cell has to mean what a sum in a rolled-up row means, or the two views of the
 * same figure disagree.
 */

export type AggKind =
  | 'sum'
  | 'avg'
  | 'last'
  | 'first'
  | 'min'
  | 'max'
  | 'median'
  | 'concat'
  | 'ratio'
  | 'count'
  | 'countDistinct';

/** `ratio` reads its own two columns off the fact rather than a single value. */
export interface AggSpec {
  type?: AggKind;
  numerator?: string;
  denominator?: string;
}

/** Coerce to a finite number, or null. Blank cells are absent, not zero. */
export const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Empty accumulator for a kind. */
export function neuter(type: AggKind | string): any {
  switch (type) {
    case 'ratio':
      return { n: 0, d: 0 };
    case 'sum':
    case 'count':
      return 0;
    case 'countDistinct':
      return new Set<string>();
    case 'avg':
    case 'last':
    case 'first':
    case 'min':
    case 'max':
    case 'median':
    case 'concat':
      return [];
    default:
      return null;
  }
}

/**
 * Fold one value into an accumulator.
 *
 * Non-numeric input is skipped rather than folded in: `parseFloat('')` is NaN,
 * and one blank cell used to poison a whole column's sum.
 */
export function step(type: AggKind | string, target: any, value: any, spec?: AggSpec, fact?: any): any {
  switch (type) {
    case 'ratio': {
      // Rates do not average. Accumulate numerator and denominator, divide once
      // in finalize, so the group's rate is the rate of the group.
      const n = num(fact?.[spec?.numerator as string]);
      const d = num(fact?.[spec?.denominator as string]);
      if (n !== null) target.n += n;
      if (d !== null) target.d += d;
      return target;
    }
    case 'count':
      return target + 1;
    case 'countDistinct':
      if (value !== null && value !== undefined && value !== '') target.add(String(value));
      return target;
    case 'sum': {
      const n = num(value);
      return n === null ? target : target + n;
    }
    case 'avg':
    case 'last':
    case 'first':
    case 'max':
    case 'min':
    case 'median': {
      const n = num(value);
      if (n !== null) target.push(n);
      return target;
    }
    case 'concat':
      if (value !== null && value !== undefined) target.push(String(value));
      return target;
    default:
      return null;
  }
}

/** Turn an accumulator into the value that lands in the output record. */
export function finalize(type: AggKind | string, target: any): any {
  switch (type) {
    case 'ratio':
      return target.d === 0 ? null : target.n / target.d;
    case 'count':
      return target;
    case 'countDistinct':
      return target.size;
    case 'sum':
      return target;
    case 'avg':
      // Nothing observed is not zero, and it is not NaN either.
      return target.length ? target.reduce((a: number, b: number) => a + b, 0) / target.length : null;
    case 'last':
      return target.length ? target[target.length - 1] : null;
    case 'first':
      return target.length ? target[0] : null;
    case 'max':
      return target.length ? Math.max(...target) : null;
    case 'min':
      return target.length ? Math.min(...target) : null;
    case 'median': {
      // Values arrive in scan order; a median of an unsorted list is not a median.
      const sorted = target.slice().sort((a: number, b: number) => a - b);
      if (!sorted.length) return null;
      if (sorted.length % 2 === 0) {
        const hi = sorted.length / 2;
        return (sorted[hi] + sorted[hi - 1]) / 2;
      }
      return sorted[(sorted.length - 1) / 2];
    }
    case 'concat':
      return target.join(', ');
    default:
      return target;
  }
}

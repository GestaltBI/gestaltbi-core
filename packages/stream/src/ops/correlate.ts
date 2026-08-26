import { num } from '../agg.js';
import { AbstractOp } from '../op.js';
import { dimensionColumns } from '../resolve.js';
import { MEASURE } from '../tags.js';

/** What kind of pair a coefficient describes. */
export type PairKind = 'measure-measure' | 'dimension-measure' | 'dimension-dimension';

/**
 * One scored pair: which two columns, how strongly they move together, and
 * by what method.
 */
export interface Association {
  a: string;
  b: string;
  kind: PairKind;
  /** `pearson` / `spearman` for two measures, `eta` for a split, `cramersV` for two dimensions. */
  method: string;
  /** Signed for measure pairs, 0..1 for the others. Null when it could not be computed. */
  coefficient: number | null;
  /** Complete observations behind it. */
  n: number;
  strength: 'none' | 'weak' | 'moderate' | 'strong' | 'undefined';
  /** One line, safe to render straight into a card. */
  summary: string;
  /** Set when the pair was skipped. */
  reason?: string;
}

/**
 * Which pairs to score, and how strong a result has to be to be worth
 * reporting.
 */
export interface CorrelateOptions {
  /** Numeric columns. Defaults to everything tagged `uatu:measure` and present in the frame. */
  measures?: string[];
  /** Categorical columns. Defaults to every column tagged as a dimension. */
  dimensions?: string[];
  /** `pearson` (default) measures a straight-line relationship, `spearman` a monotonic one. */
  method?: 'pearson' | 'spearman';
  /** Which families to compute. Default: all three. */
  include?: PairKind[];
  /** Only these pairs, in order. Overrides the generated matrix. */
  pairs?: Array<[string, string]>;
  /** Fewer complete observations than this and the pair is skipped. Default 3. */
  minPairs?: number;
  /** A dimension with more levels than this is not summarised. Default 50. */
  maxLevels?: number;
  /** Drop pairs weaker than this absolute coefficient. Default 0 (keep all). */
  minCoefficient?: number;
  /** Cap on emitted rows, strongest first. */
  limit?: number;
}

/**
 * How strongly the columns of a frame move together.
 *
 * The rest of the package reads a frame along time — deltas, recognition,
 * cohorts. This reads it across dimensions instead, and answers the question a
 * pivot table raises but cannot settle: of everything collected, which pairs
 * actually travel together, and how strongly.
 *
 * Three relationships, because "correlation" means a different statistic
 * depending on what is being related:
 *
 * - **measure x measure** — Pearson's r, or Spearman's rho on ranks when the
 *   relationship is monotonic but not straight. Signed: -1 to 1.
 * - **dimension x measure** — the correlation ratio eta: how much of the
 *   measure's variance is explained by which group a row falls in. 0 to 1.
 * - **dimension x dimension** — Cramer's V over the contingency table. 0 to 1.
 *
 * ```json
 * { "op": "correlate", "require": ["clean"], "options": {
 *     "method": "spearman", "minCoefficient": 0.3, "limit": 20 } }
 * ```
 *
 * Terminal, like `assert`: it returns {@link Association} records rather than
 * rows, ordered strongest first.
 *
 * A coefficient is not a cause. Two measures derived from one another — a total
 * and its own component — will correlate near 1 and mean nothing.
 */
export class Correlate extends AbstractOp {
  public run(df: any): any {
    const rows: any[] = df[0] ?? [];
    const o: CorrelateOptions = this.options ?? {};
    const minPairs = Math.max(2, Math.round(o.minPairs ?? 3));
    const maxLevels = Math.max(2, Math.round(o.maxLevels ?? 50));
    const method = o.method ?? 'pearson';
    if (!rows.length) return [];

    const measures = (o.measures ?? this.tagged(MEASURE)).filter((c) => this.present(rows, c));
    const dimensions = (o.dimensions ?? this.dimensions()).filter((c) => this.present(rows, c));
    const include = o.include ?? ['measure-measure', 'dimension-measure', 'dimension-dimension'];

    const out: Association[] = [];
    for (const [a, b] of this.pairsToTest(o, measures, dimensions, include)) {
      const aIsMeasure = measures.includes(a);
      const bIsMeasure = measures.includes(b);
      if (aIsMeasure && bIsMeasure) {
        out.push(this.numericPair(rows, a, b, method, minPairs));
      } else if (aIsMeasure !== bIsMeasure) {
        const dim = aIsMeasure ? b : a;
        const measure = aIsMeasure ? a : b;
        out.push(this.splitPair(rows, dim, measure, minPairs, maxLevels));
      } else {
        out.push(this.categoricalPair(rows, a, b, minPairs, maxLevels));
      }
    }

    const floor = o.minCoefficient ?? 0;
    const kept = out.filter((r) => r.coefficient !== null && Math.abs(r.coefficient) >= floor);
    kept.sort((x, y) => Math.abs(y.coefficient as number) - Math.abs(x.coefficient as number));
    const skipped = out.filter((r) => r.coefficient === null);
    const ranked = [...kept, ...skipped];
    return o.limit ? ranked.slice(0, Math.max(1, Math.round(o.limit))) : ranked;
  }

  // ------------------------------------------------------------- selection ---

  /** Dimensions, refinements included. */
  private dimensions(): string[] {
    try {
      return dimensionColumns(this.columnDirectory);
    } catch {
      return [];
    }
  }

  private tagged(tag: string): string[] {
    try {
      return this.columnDirectory?.getColumnsFor(tag) ?? [];
    } catch {
      return [];
    }
  }

  private present(rows: any[], column: string): boolean {
    return rows.some((r) => Object.prototype.hasOwnProperty.call(r, column));
  }

  /** Explicit pairs when given, otherwise the upper triangle of each requested family. */
  private pairsToTest(
    o: CorrelateOptions,
    measures: string[],
    dimensions: string[],
    include: PairKind[],
  ): Array<[string, string]> {
    if (o.pairs?.length) return o.pairs;
    const pairs: Array<[string, string]> = [];
    if (include.includes('measure-measure')) {
      for (let i = 0; i < measures.length; i++)
        for (let j = i + 1; j < measures.length; j++) pairs.push([measures[i], measures[j]]);
    }
    if (include.includes('dimension-measure')) {
      for (const d of dimensions) for (const m of measures) pairs.push([d, m]);
    }
    if (include.includes('dimension-dimension')) {
      for (let i = 0; i < dimensions.length; i++)
        for (let j = i + 1; j < dimensions.length; j++) pairs.push([dimensions[i], dimensions[j]]);
    }
    return pairs;
  }

  // ------------------------------------------------------------ statistics ---

  /** Pearson, or Spearman by ranking both series first. */
  private numericPair(rows: any[], a: string, b: string, method: string, minPairs: number): Association {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const row of rows) {
      const x = num(row[a]);
      const y = num(row[b]);
      if (x === null || y === null) continue;
      xs.push(x);
      ys.push(y);
    }
    const base = { a, b, kind: 'measure-measure' as const, method, n: xs.length };
    if (xs.length < minPairs) return this.skip(base, `only ${xs.length} rows carry both`);

    const [u, v] = method === 'spearman' ? [rank(xs), rank(ys)] : [xs, ys];
    const r = pearson(u, v);
    if (r === null) return this.skip(base, 'one of the two never varies');
    return this.describe(base, r, `${a} and ${b} move together at r=${r.toFixed(2)} over ${xs.length} rows`);
  }

  /**
   * Correlation ratio: the share of a measure's variance explained by which
   * group a row belongs to. Answers "does this dimension separate the measure".
   */
  private splitPair(rows: any[], dim: string, measure: string, minPairs: number, maxLevels: number): Association {
    const groups = new Map<string, number[]>();
    let n = 0;
    for (const row of rows) {
      const y = num(row[measure]);
      if (y === null) continue;
      const k = row[dim] === null || row[dim] === undefined || row[dim] === '' ? '(blank)' : String(row[dim]);
      if (!groups.has(k)) groups.set(k, []);
      (groups.get(k) as number[]).push(y);
      n++;
    }
    const base = { a: dim, b: measure, kind: 'dimension-measure' as const, method: 'eta', n };
    if (n < minPairs) return this.skip(base, `only ${n} rows carry ${measure}`);
    if (groups.size < 2) return this.skip(base, `${dim} has a single level here`);
    if (groups.size > maxLevels) return this.skip(base, `${dim} has ${groups.size} levels, over the cap`);

    const all: number[] = [];
    groups.forEach((g) => all.push(...g));
    const mean = all.reduce((s, x) => s + x, 0) / all.length;
    const total = all.reduce((s, x) => s + (x - mean) ** 2, 0);
    if (total === 0) return this.skip(base, `${measure} never varies`);

    let between = 0;
    groups.forEach((g) => {
      const gm = g.reduce((s, x) => s + x, 0) / g.length;
      between += g.length * (gm - mean) ** 2;
    });
    const eta = Math.sqrt(Math.min(1, between / total));
    return this.describe(
      base,
      eta,
      `${dim} explains ${(eta * eta * 100).toFixed(0)}% of the variance in ${measure} across ${groups.size} levels`,
    );
  }

  /** Cramer's V over the contingency table of two categorical columns. */
  private categoricalPair(rows: any[], a: string, b: string, minPairs: number, maxLevels: number): Association {
    const table = new Map<string, Map<string, number>>();
    const rowTot = new Map<string, number>();
    const colTot = new Map<string, number>();
    let n = 0;
    const label = (v: any) => (v === null || v === undefined || v === '' ? '(blank)' : String(v));
    for (const row of rows) {
      if (!(a in row) || !(b in row)) continue;
      const ka = label(row[a]);
      const kb = label(row[b]);
      if (!table.has(ka)) table.set(ka, new Map());
      const r = table.get(ka) as Map<string, number>;
      r.set(kb, (r.get(kb) ?? 0) + 1);
      rowTot.set(ka, (rowTot.get(ka) ?? 0) + 1);
      colTot.set(kb, (colTot.get(kb) ?? 0) + 1);
      n++;
    }
    const base = { a, b, kind: 'dimension-dimension' as const, method: 'cramersV', n };
    if (n < minPairs) return this.skip(base, `only ${n} rows carry both`);
    if (rowTot.size < 2 || colTot.size < 2) return this.skip(base, 'one of the two has a single level here');
    if (rowTot.size > maxLevels || colTot.size > maxLevels)
      return this.skip(base, `${Math.max(rowTot.size, colTot.size)} levels, over the cap`);

    let chi2 = 0;
    rowTot.forEach((ra, ka) => {
      colTot.forEach((cb, kb) => {
        const expected = (ra * cb) / n;
        const observed = table.get(ka)?.get(kb) ?? 0;
        chi2 += (observed - expected) ** 2 / expected;
      });
    });
    const k = Math.min(rowTot.size, colTot.size) - 1;
    const v = Math.sqrt(Math.min(1, chi2 / (n * k)));
    return this.describe(base, v, `${a} and ${b} are associated at V=${v.toFixed(2)} over ${n} rows`);
  }

  // ---------------------------------------------------------------- shaping ---

  private skip(base: any, reason: string): Association {
    return { ...base, coefficient: null, strength: 'undefined', summary: `skipped — ${reason}`, reason };
  }

  private describe(base: any, coefficient: number, summary: string): Association {
    return { ...base, coefficient, strength: strengthOf(coefficient), summary };
  }
}

// ------------------------------------------------------------------ helpers ---

/** Conventional bands. A coefficient is a description, not a verdict. */
const strengthOf = (r: number): Association['strength'] => {
  const a = Math.abs(r);
  if (a < 0.2) return 'none';
  if (a < 0.4) return 'weak';
  if (a < 0.7) return 'moderate';
  return 'strong';
};

/** Pearson's r. Null when either series is constant. */
function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Fractional ranks, ties averaged, so Spearman handles repeated values. */
function rank(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
  const out = new Array(values.length).fill(0);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const shared = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k][1]] = shared;
    i = j + 1;
  }
  return out;
}
